const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const ScanLog = require('../models/ScanLog');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { generateTicketPDF } = require('../services/pdfService');
const admin = require('firebase-admin');

// Helper for real-time Firebase sync
const syncTicketToFirebase = async (eventId, ticketId, data) => {
    try {
        if (admin.apps.length > 0) {
            await admin.firestore()
                .collection('events')
                .doc(eventId.toString())
                .collection('tickets')
                .doc(ticketId.toString())
                .set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
    } catch (err) {
        console.error('Firebase Sync Error:', err.message);
    }
};

// @desc    Get Ticket Details (including QR URL for frontend display)
// @route   GET /api/v1/tickets/:id
// @access  Private
exports.getTicket = async (req, res, next) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate('event', 'title date time venue bannerImage foodSettings addonsSettings')
            .populate('booking', 'ticketType quantity totalAmount selectedDate selectedDays amountPaid paymentStatus selectedFood selectedAddons');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Only owner, admin, organizer, or staff can view (if user is logged in)
        if (req.user) {
            const isOwner = ticket.user && ticket.user.toString() === req.user.id;
            const isStaffOrAdmin = ['admin', 'organizer', 'staff'].includes(req.user.role);
            if (!isOwner && !isStaffOrAdmin) {
                return res.status(401).json({ success: false, message: 'Not authorized' });
            }
        }

        const QRCode = require('qrcode');
        const baseUrl = process.env.PUBLIC_URL || (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : `${req.protocol}://${req.get('host')}`);
        
        const jwt = require('jsonwebtoken');
        
        // Fetch organizer's addons to map names to codes
        const eventDoc = await Event.findById(ticket.eventId || ticket.event?._id).populate('organizer');
        const organizerAddons = eventDoc?.organizer?.operationalAddons || [];
        let activeAddons = [];
        
        if (ticket.booking && ticket.booking.selectedAddons) {
            ticket.booking.selectedAddons.forEach(sa => {
                const match = organizerAddons.find(a => a.name.toLowerCase() === sa.itemName?.toLowerCase());
                if (match && match.addonCode) activeAddons.push(match.addonCode);
            });
        }
        if (ticket.booking && ticket.booking.selectedFood) {
            ticket.booking.selectedFood.forEach(sf => {
                const match = organizerAddons.find(a => a.name.toLowerCase() === sf.itemName?.toLowerCase());
                if (match && match.addonCode) activeAddons.push(match.addonCode);
            });
        }
        
        // Ensure unique addons
        activeAddons = [...new Set(activeAddons)];

        const secureToken = ticket.uuid + (activeAddons.length > 0 ? '?addons=' + activeAddons.join(',') : '');
        
        const verificationUrl = `${baseUrl}/ticket/${secureToken}`;
        const qrCodeUrl = await QRCode.toDataURL(verificationUrl);

        res.status(200).json({
            success: true,
            data: ticket,
            qrCodeUrl: qrCodeUrl
        });
    } catch (err) {
        console.error("Error in getTicket:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Manual Ticket Creation (Admin-only)
// @route   POST /api/v1/tickets/create
// @access  Private (Admin)
exports.createTicket = async (req, res, next) => {
    try {
        const { name, email, eventId, ticketType, ticketPrice, mobileNumber } = req.body;
        
        const { getNextSequenceValue } = require('../utils/sequenceGenerator');
        const uuid = uuidv4();
        const ticketCode = await getNextSequenceValue('ticket_id', 'GUTC');

        const ticket = await Ticket.create({
            uuid,
            ticketCode: ticketCode,
            name,
            email,
            mobileNumber: mobileNumber || '0000000000',
            eventName: 'Manual Entry', // Fallback for manual
            eventId,
            ticketType: ticketType || 'General',
            ticketPrice: ticketPrice || 0,
            user: req.user.id,
            status: 'unused',
            bookedAt: new Date()
        });

        res.status(201).json({
            success: true,
            data: ticket
        });
    } catch (err) {
        console.error("Manual Ticket Creation Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Download Ticket PDF
// @route   GET /api/v1/tickets/:id/download
// @access  Private
exports.downloadTicket = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        
        // Security Check
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        
        if (req.user) {
            const isOwner = ticket.user && ticket.user.toString() === req.user.id;
            const isStaffOrAdmin = ['admin', 'organizer', 'staff'].includes(req.user.role);
            if (!isOwner && !isStaffOrAdmin) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
        }

        const buffer = await generateTicketPDF(ticketId);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Ticket-${ticketId.substring(0,8)}.pdf`);
        res.send(buffer);
    } catch (err) {
        console.error("PDF Download Error:", err.message);
        res.status(500).json({ success: false, message: "Could not generate PDF" });
    }
};

// @desc    Download Ticket PDF (Public, secured by UUID)
// @route   GET /api/ticket/download-pdf/:uuid
// @access  Public
exports.downloadTicketPublic = async (req, res, next) => {
    try {
        const uuid = req.params.uuid;
        
        // Fetch ticket
        const ticket = await Ticket.findOne({ uuid });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        
        const { generateTicketPDF } = require('../services/pdfService');
        const buffer = await generateTicketPDF(ticket._id);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Ticket-${ticket.ticketCode}.pdf`);
        res.send(buffer);
    } catch (err) {
        console.error("Public PDF Download Error:", err.message);
        res.status(500).json({ success: false, message: "Could not generate PDF" });
    }
};

// @desc    Verify Ticket for Scanner (Public URL version)
// @route   GET /api/ticket/verify/:id
// @access  Public (Verification page will display info)
exports.verifyTicketForScanner = async (req, res) => {
    try {
        let ticketId = req.params.id; // This is the uuid
        
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(ticketId, process.env.JWT_SECRET || 'fallback_secret');
            if (decoded && decoded.ticketId) {
                ticketId = decoded.ticketId;
            }
        } catch (err) {
            // It's probably just a legacy UUID, proceed normally.
        }
        
        const ticket = await Ticket.findOne({ uuid: ticketId })
            .populate('event', 'title date time venue')
            .populate('user', 'name email');

        if (!ticket) {
            return res.status(200).json({ 
                success: true, 
                status: 'ACCESS DENIED — Invalid ticket',
                message: 'Ticket ID not found in database.' 
            });
        }

        // --- VALIDATION LOGIC ---
        const booking = await Booking.findById(ticket.booking);
        const event = ticket.event || (booking ? booking.event : null);
        
        // Source of Truth
        const currentAmountPaid = booking ? (booking.amountPaid || 0) : (ticket.amountPaid || 0);
        const currentTotalAmount = booking ? booking.totalAmount : (ticket.totalAmount || 0);
        const currentRemaining = Math.max(0, currentTotalAmount - currentAmountPaid);
        const currentPaymentStatus = booking ? (booking.paymentStatus || 'PENDING').toUpperCase() : (ticket.paymentStatus || 'UNKNOWN');

        // Multi-day logic
        const durationDays = 5;
        const validityText = `Valid for 5 Days`;

        // Today's Plan Resolution (Robust Day-Specific Matching)
        let todayPlanInfo = ticket.ticketType;
        if (event && event.isMultiDay && booking && booking.selectedPlans) {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            const matchedDateKey = Object.keys(booking.selectedPlans).find(key => {
                try {
                    const keyDate = new Date(key);
                    return keyDate.toISOString().split('T')[0] === todayStr;
                } catch (e) {
                    return false;
                }
            });
            if (matchedDateKey) {
                todayPlanInfo = booking.selectedPlans[matchedDateKey];
            } else {
                const planValues = Object.values(booking.selectedPlans);
                if (planValues.length > 0) todayPlanInfo = planValues[0];
            }
        }

        const details = {
            ticketId: ticket._id,
            _id: ticket._id,
            ticket: ticket._id,
            ticketCode: ticket.ticketCode,
            name: ticket.name,
            email: ticket.email,
            phone: ticket.mobileNumber,
            eventName: ticket.eventName || (event ? event.title : 'Event'),
            status: ticket.status.toUpperCase(),
            paymentStatus: currentPaymentStatus,
            ticketTier: todayPlanInfo,
            selectedPlan: todayPlanInfo,
            planName: todayPlanInfo,
            ticketPrice: currentTotalAmount,
            totalAmount: currentTotalAmount,
            amountPaid: currentAmountPaid,
            paidAmount: currentAmountPaid,
            remainingAmount: currentRemaining,
            dueAmount: currentRemaining,
            validity: validityText,
            selectedDate: ticket.selectedDate,
            selectedDays: ticket.selectedDays,
            bookedAt: ticket.bookedAt,
            seat: ticket.seatNumber || 'General',
            foodTaken: ticket.foodTaken || false,
            parkingUsed: ticket.parkingUsed || false,
            addonsTaken: ticket.addonsTaken || false,
            // GROUP TICKET LOGIC: Include quantity information for group tickets
            personsAllowed: ticket.quantity || 1,
            quantityBooking: `${ticket.quantity || 1} Person${(ticket.quantity || 1) > 1 ? 's' : ''} Allowed`
        };

        // 1. Cancelled Ticket
        if (ticket.status === 'cancelled') {
            return res.status(200).json({
                success: true,
                status: 'DENIED',
                isDuplicate: true,
                message: 'Ticket Cancelled',
                data: details,
                ticket: details
            });
        }

        // 2. Payment Pending Check
        const isPaid = (
            currentPaymentStatus === 'COMPLETED' || 
            currentPaymentStatus === 'PAID' || 
            currentRemaining <= 0
        );
        
        if (!isPaid) {
            return res.status(200).json({
                success: true,
                status: 'DENIED',
                isDuplicate: false,
                message: `Payment Pending: ₹${currentRemaining}`,
                data: details,
                ticket: details
            });
        }

        // 3. DAILY SCAN LIMIT (continuous multi-day should be day-scoped)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const now = new Date();

        const isContinuousMultiDay = Boolean(event?.continuousMultiDay);
        const isScanOnIncludedDay = !isContinuousMultiDay; // default

        if (isContinuousMultiDay && booking && booking.selectedPlans) {
            try {
                const nowStr = now.toISOString().split('T')[0];
                const matchedDateKey = Object.keys(booking.selectedPlans).find(key => {
                    const keyDate = new Date(key);
                    return keyDate.toISOString().split('T')[0] === nowStr;
                });
                isScanOnIncludedDay = Boolean(matchedDateKey);
            } catch (e) {
                isScanOnIncludedDay = false;
            }
        }


        // Let the scanner handle daily scan logic based on dailyScans Map

        return res.status(200).json({
            success: true,
            status: 'GRANTED',
            isDuplicate: false,
            message: 'Clear for Entry',
            data: details,
            ticket: details
        });

    } catch (err) {
        console.error("Scanner Verification Error:", err.message);
        res.status(500).json({ success: false, message: 'Internal Server Error during verification' });
    }
};

// @desc    Verify Ticket for Staff Scanner (Access Control)
// @route   GET /api/v1/tickets/verify/:id
// @access  Private (Staff/Admin)
exports.verifyTicketForStaff = async (req, res) => {
    try {
        let ticketId = req.params.id; // Could be uuid
        
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(ticketId, process.env.JWT_SECRET || 'fallback_secret');
            if (decoded && decoded.ticketId) {
                ticketId = decoded.ticketId;
            }
        } catch (err) {
            // It's probably just a legacy UUID, proceed normally.
        }
        
        const ticket = await Ticket.findOne({ 
            $or: [
                { uuid: ticketId },
                { ticketCode: ticketId }
            ]
        }).populate('event', 'title date venue');

        if (!ticket) {
            return res.status(200).json({ 
                success: true,
                status: 'INVALID',
                message: 'Ticket not found in system node.'
            });
        }

        const details = {
            name: ticket.name,
            email: ticket.email,
            eventName: ticket.eventName || ticket.event?.title || 'Unknown Event',
            ticketCode: ticket.ticketCode,
            ticketType: ticket.ticketType,
            isScanned: ticket.isScanned,
            status: ticket.status,
            selectedDate: ticket.selectedDate || ticket.event?.date,
            selectedDays: ticket.selectedDays,
            // GROUP TICKET LOGIC: Include quantity for staff scanner display
            personsAllowed: ticket.quantity || 1,
            quantityLabel: `${ticket.quantity || 1} Person${(ticket.quantity || 1) > 1 ? 's' : ''} Allowed`
        };

        // ACCESS CONTROL LOGIC
        const booking = await Booking.findById(ticket.booking);
        if (!booking || booking.amountPaid < booking.totalAmount) {
            return res.status(200).json({
                success: true,
                status: 'DENIED',
                message: 'ACCESS DENIED: Full amount not paid ⚠️',
                ticket: details
            });
        }

        if (ticket.isScanned || ticket.status === 'used') {
            return res.status(200).json({
                success: true,
                status: 'USED',
                message: 'ACCESS DENIED: Ticket Already Used',
                ticket: details
            });
        }

        // VALID ENTRY -> Update Status
        ticket.isScanned = true;
        ticket.status = 'used';
        ticket.scannedAt = Date.now();
        await ticket.save();

        return res.status(200).json({
            success: true,
            status: 'VALID',
            message: 'ACCESS GRANTED: Clear for Entry',
            ticket: details
        });

    } catch (err) {
        console.error("Staff Verification Error:", err.message);
        res.status(500).json({ success: false, message: 'Encryption breach in verification node.' });
    }
};

// Internal function to create ticket after payment
// This is used by booking control flow
exports.createTicketAfterPayment = async (bookingId, eventId, userId) => {
    try {
        console.log("[TICKET] STEP: Initiating createTicketAfterPayment");
        
        // STRICT OBJECTID ENFORCEMENT: Remove manual virtual-admin string bypasses.
        const userDoc = await User.findById(userId);
        
        const booking = await Booking.findById(bookingId);
        const event = await Event.findById(eventId);
        
        if (!userDoc || !booking || !event) {
            throw new Error(`Integrity Error: Missing dependencies for Ticket creation`);
        }

        const { getNextSequenceValue } = require('../utils/sequenceGenerator');
        const ticketPrice = booking.quantity > 0 ? booking.totalAmount / booking.quantity : booking.totalAmount;

        const tickets = [];
        const quantityToCreate = Math.max(booking.quantity || 1, booking.attendeeDetails?.length || 0);

        for (let i = 0; i < quantityToCreate; i++) {
            const attendee = booking.attendeeDetails && booking.attendeeDetails[i]
                ? booking.attendeeDetails[i]
                : (i === 0 ? { name: userDoc.name, email: userDoc.email, phone: userDoc.phone } : { name: `Guest ${i + 1}`, email: booking.contactEmail || userDoc.email });

            const uniqueId = uuidv4();
            const sequentialId = await getNextSequenceValue('ticket_id', 'GUTC');

            const ticketData = {
                uuid: uniqueId,
                ticketCode: sequentialId, 
                name: attendee.name || userDoc.name || `Attendee ${i + 1}`,
                mobileNumber: attendee.phone || userDoc.phone || booking.attendeeDetails?.[0]?.phone || '0000000000',
                email: attendee.email || booking.contactEmail || userDoc.email || 'guest@growthu.com',
                eventName: event.title,
                eventId: eventId,
                ticketType: booking.ticketType || "General",
                ticketPrice: ticketPrice,
                bookedAt: booking.createdAt || new Date(),
                status: 'unused',
                booking: bookingId,
                event: eventId,
                user: userDoc._id,
                selectedDate: booking.selectedDate,
                selectedDays: booking.selectedDays,
                amountPaid: booking.amountPaid || 0,
                totalAmount: booking.totalAmount,
                paymentStatus: booking.paymentStatus === 'completed' ? 'PAID' : 'PARTIAL',
                quantity: 1  // Each individual ticket allows exactly 1 person
            };

            const ticket = await Ticket.create(ticketData);
            tickets.push(ticket);
        }

        // Return primary/first ticket so legacy code setting booking.ticketId still works
        return tickets[0];
    } catch (err) {
        console.error("createTicketAfterPayment Error:", err);
        throw err;
    }
};

// @desc    Verify Scanned Ticket
// @route   POST /api/v1/tickets/verify
// @access  Private (Staff/Admin)
exports.verifyTicket = async (req, res, next) => {
    try {
        const { uuid, eventId } = req.body;
        let actualUuid = uuid || req.body.ticketCode;

        if (!actualUuid) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(actualUuid, process.env.JWT_SECRET || 'fallback_secret');
            if (decoded && decoded.ticketId) {
                actualUuid = decoded.ticketId;
            }
        } catch (err) {
            // Proceed normally
        }

        const ticket = await Ticket.findOne({ uuid: actualUuid }).populate('event', 'title date time');

        if (!ticket) {
            return res.json({ 
                success: true, 
                status: "ACCESS DENIED — Invalid ticket", 
                message: "This identifier does not match any registered ticket." 
            });
        }

        if (eventId && ticket.eventId.toString() !== eventId) {
            return res.status(400).json({ success: false, message: 'Ticket belongs to a different event' });
        }

        if (ticket.status === 'used') {
            return res.status(400).json({ 
                success: false, 
                message: 'Already Used',
                data: ticket
            });
        }

        ticket.status = 'used';
        ticket.scannedAt = Date.now();
        await ticket.save();

        await ScanLog.create({ ticketId: ticket._id, staffId: req.user.id, eventId: ticket.eventId, status: 'success' });

        res.status(200).json({
            success: true,
            message: 'Entry Allowed',
            data: ticket
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get Today's Events for Scanning
// @route   GET /api/v1/tickets/today
// @access  Private (Staff/Admin)
exports.getTodayEvents = async (req, res, next) => {
    try {
        const start = new Date(); start.setHours(0,0,0,0);
        const end = new Date(); end.setHours(23,59,59,999);

        const events = await Event.find({
            $or: [ { date: { $gte: start, $lte: end } }, { status: 'live' } ]
        }).select('title date time venue status').lean();

        res.status(200).json({ success: true, count: events.length, data: events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Verify Ticket by Manual Code Entry
// @route   POST /api/v1/tickets/verify-manual
// @access  Private (Staff/Admin)
exports.verifyManualTicket = async (req, res, next) => {
    try {
        const { ticketCode, eventId } = req.body;
        const ticket = await Ticket.findOne({ uuid: ticketCode }).populate('event', 'title date venue');

        if (!ticket) return res.status(404).json({ success: false, message: 'Invalid Ticket' });

        if (ticket.status === 'used') return res.status(400).json({ success: false, message: 'Already Used' });

        ticket.status = 'used';
        ticket.scannedAt = Date.now();
        await ticket.save();

        res.status(200).json({ success: true, message: 'Entry Allowed', data: ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
// @desc    Verify Ticket Scan (Staff Access Control)
// @route   POST /api/v1/tickets/verify-scan
// @access  Private (Staff/Admin)
exports.verifyTicketScan = async (req, res) => {
    try {
        let { ticketId } = req.body;
        let jwtAddons = [];

        if (ticketId.includes('?addons=')) {
            const parts = ticketId.split('?addons=');
            ticketId = parts[0];
            if (parts[1]) {
                jwtAddons = parts[1].split(',');
            }
        } else {
            const jwt = require('jsonwebtoken');
            try {
                const decoded = jwt.verify(ticketId, process.env.JWT_SECRET || 'fallback_secret');
                if (decoded && decoded.ticketId) {
                    ticketId = decoded.ticketId;
                }
                if (decoded && decoded.addons) {
                    jwtAddons = decoded.addons;
                }
            } catch (err) {
                // Proceed normally
            }
        }

        // Single query: fetch ticket + its booking in one aggregation
        const results = await Ticket.aggregate([
            { $match: { $or: [{ uuid: ticketId }, { ticketCode: ticketId }] } },
            { $limit: 1 },
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'booking',
                    foreignField: '_id',
                    as: 'bookingDoc'
                }
            },
            { $addFields: { bookingDoc: { $arrayElemAt: ['$bookingDoc', 0] } } },
            {
                $lookup: {
                    from: 'events',
                    localField: 'event',
                    foreignField: '_id',
                    as: 'eventDoc',
                    pipeline: [{ $project: { title: 1, date: 1, venue: 1, isMultiDay: 1, multiDayPlan: 1, organizer: 1 } }]
                }
            },
            { $addFields: { eventDoc: { $arrayElemAt: ['$eventDoc', 0] } } }
        ]);

        if (!results.length) {
            return res.json({ 
                success: true, 
                status: "ACCESS DENIED — Invalid ticket", 
                message: "This identifier does not match any registered ticket." 
            });
        }

        const ticket = results[0];
        const booking = ticket.bookingDoc && ticket.bookingDoc.length > 0 ? ticket.bookingDoc[0] : null;
        const event = ticket.eventDoc;

        // 2. Event Exists
        if (!event) {
            return res.json({ 
                success: true, status: "DENIED", message: "Event not found for this ticket.",
                ticket: { _id: ticket._id, name: ticket.name }, data: { _id: ticket._id, name: ticket.name }
            });
        }

        // 3. Event Active & 4. QR Validity Date
        // Assume event is active if we are processing. If event has strict dates:
        const todayStr = new Date().toLocaleDateString('en-CA');
        // Let's implement robust QR Validity (Event Date)
        // If event is single day, it must be today. If multi-day, today must be in selectedDays/Plans.
        // For simplicity as requested in Phase 8, if we can't find a matching plan/date, we reject.
        
        let todayPlanInfo = ticket.ticketType;
        let isScanOnIncludedDay = true;
        
        if (event.isMultiDay && booking && booking.selectedPlans) {
            const matchedDateKey = Object.keys(booking.selectedPlans).find(key => {
                try {
                    return new Date(key).toISOString().split('T')[0] === todayStr;
                } catch (e) { return false; }
            });
            if (matchedDateKey) {
                todayPlanInfo = booking.selectedPlans[matchedDateKey];
            } else {
                isScanOnIncludedDay = false; // Not valid for today
            }
        } else if (!event.isMultiDay && event.date) {
            // Strict single day check could go here. For now we allow it to pass if they have the ticket.
        }

        if (!isScanOnIncludedDay) {
            return res.json({ 
                success: true, status: "DENIED", message: "QR validity expired or not valid for today.",
                ticket: { _id: ticket._id, name: ticket.name }, data: { _id: ticket._id, name: ticket.name }
            });
        }

        // Financials (must be paid)
        const currentAmountPaid = booking ? (booking.amountPaid || 0) : (ticket.amountPaid || 0);
        const currentTotalAmount = booking ? booking.totalAmount : (ticket.totalAmount || 0);
        const currentRemaining = Math.max(0, currentTotalAmount - currentAmountPaid);
        const currentPaymentStatus = booking ? (booking.paymentStatus || 'PENDING').toUpperCase() : (ticket.paymentStatus || 'UNKNOWN');
        const isPaid = (currentPaymentStatus === 'COMPLETED' || currentPaymentStatus === 'PAID' || currentRemaining <= 0);

        if (ticket.status === 'cancelled') {
            return res.json({ success: true, status: "DENIED", message: "Ticket Cancelled", ticket: { _id: ticket._id, name: ticket.name }, data: { _id: ticket._id, name: ticket.name } });
        }

        if (!isPaid) {
            return res.json({ success: true, status: "DENIED", message: currentAmountPaid > 0 ? `₹${currentRemaining} payment remaining` : `Payment Pending`, ticket: { _id: ticket._id, name: ticket.name }, data: { _id: ticket._id, name: ticket.name } });
        }

        if (!ticket.dailyScans) ticket.dailyScans = {};
        
        let dailyState;
        if (ticket.dailyScans instanceof Map) {
            if (!ticket.dailyScans.has(todayStr)) {
                ticket.dailyScans.set(todayStr, { entry: false, addons: {} });
            }
            dailyState = ticket.dailyScans.get(todayStr);
        } else {
            if (!ticket.dailyScans[todayStr]) {
                ticket.dailyScans[todayStr] = { entry: false, addons: {} };
            }
            dailyState = ticket.dailyScans[todayStr];
        }

        let scopedDetails = {
            ticketId: ticket._id,
            _id: ticket._id,
            eventId: ticket.eventId || event._id,
            name: ticket.name,
            eventName: ticket.eventName || event.title,
            status: ticket.status,
            paymentStatus: currentPaymentStatus,
            amountPaid: currentAmountPaid,
            totalAmount: currentTotalAmount,
            remainingAmount: currentRemaining,
            isScanned: false,
            addonStatuses: dailyState.addons || {}
        };

        if (req.user.role === 'staff') {
            // Check Staff Assignment
            let isAssignedToEvent = false;
            if (req.user.createdBy && event.organizer && req.user.createdBy.toString() === event.organizer.toString()) isAssignedToEvent = true;
            else if (req.user.assignedEvents && req.user.assignedEvents.map(e => e.toString()).includes(event._id.toString())) isAssignedToEvent = true;
            
            if (!isAssignedToEvent) {
                return res.json({ success: true, status: "DENIED", message: "You are not assigned to scan this ticket for this role in this event", ticket: scopedDetails, data: scopedDetails });
            }

            const staffAccessCode = req.user.assignedAccessCode || 'ENTRY';

            // 5. ENTRY Completed (Entry-first validation)
            if (staffAccessCode !== 'ENTRY' && !dailyState.entry) {
                return res.json({ success: true, status: "DENIED", message: "Entry scanning not completed.", ticket: scopedDetails, data: scopedDetails });
            }
            
            // 6. Staff Access Match
            let dbAddons = [];
            if (staffAccessCode !== 'ENTRY') {
                const EventModel = require('../models/Event');
                const evnt = await EventModel.findById(event._id).populate('organizer');
                const orgAddons = evnt?.organizer?.operationalAddons || [];
                
                // Automatically grant all organizer addons to all tickets
                orgAddons.forEach(addon => {
                    if (addon.addonCode) dbAddons.push(addon.addonCode);
                });
            }
            const allAddons = [...new Set([...jwtAddons, ...dbAddons])];

            if (staffAccessCode !== 'ENTRY' && !allAddons.includes(staffAccessCode)) {
                return res.json({ success: true, status: "DENIED", message: "This ticket does not include access to this add-on.", ticket: scopedDetails, data: scopedDetails });
            }

            // 7. Daily Usage Check
            if (staffAccessCode === 'ENTRY') {
                scopedDetails.isScanned = Boolean(dailyState.entry);
                if (dailyState.entry) {
                    return res.json({ success: true, status: "DENIED", message: "Entry already used today", ticket: scopedDetails, data: scopedDetails });
                }
            } else {
                if (!dailyState.addons) dailyState.addons = {};
                if (dailyState.addons[staffAccessCode]) {
                    return res.json({ success: true, status: "DENIED", message: "Access already used today", ticket: scopedDetails, data: scopedDetails });
                }
            }
            
            let staffAddonName = staffAccessCode;
            if (staffAccessCode !== 'ENTRY') {
                const EventModel = require('../models/Event');
                const evnt = await EventModel.findById(event._id).populate('organizer');
                const orgAddons = evnt?.organizer?.operationalAddons || [];
                const match = orgAddons.find(a => a.addonCode === staffAccessCode);
                if (match) staffAddonName = match.name;
            }

            // Log verification success
            try {
                await ScanLog.create({ 
                    ticketId: ticket._id, staffId: req.user.id, eventId: event._id, status: 'success' 
                });
            } catch (logErr) {
                console.error('ScanLog create error:', logErr);
            }

            return res.json({
                success: true,
                status: "GRANTED",
                message: "Clear for Scan",
                ticket: { ...scopedDetails, addonName: staffAddonName },
                data: { ...scopedDetails, addonName: staffAddonName }
            });
        }



    } catch (err) {
        console.error("Scan Verification Error:", err);
        res.status(500).json({ success: false, message: "Server Error: " + err.stack });
    }
};

// @desc    Update Entry Access for Ticket
// @route   POST /api/v1/tickets/update-entry
// @access  Private (Staff/Admin)
exports.updateEntryAccess = async (req, res) => {
    try {
        const { ticketId } = req.body;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(ticketId)) {
            query = { _id: ticketId };
        } else {
            query = { $or: [{ uuid: ticketId }, { ticketCode: ticketId }] };
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const ticket = await Ticket.findOne(query).populate('event');

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (ticket.status === 'cancelled') return res.status(400).json({ success: false, message: 'Ticket cancelled' });
        
        if (req.user.role === 'staff') {
            const event = ticket.event;
            if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
            let isAssigned = false;
            if (req.user.createdBy && event.organizer && req.user.createdBy.toString() === event.organizer.toString()) isAssigned = true;
            else if (req.user.assignedEvents && req.user.assignedEvents.includes(event._id)) isAssigned = true;
            if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this event' });
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (!ticket.dailyScans) ticket.dailyScans = new Map();
        if (!ticket.dailyScans.has(todayStr)) ticket.dailyScans.set(todayStr, { entry: false, food: false, parking: false, addons: {} });
        
        const dailyState = ticket.dailyScans.get(todayStr);
        if (dailyState.entry) {
            return res.status(400).json({ success: false, message: 'Entry already used today' });
        }
        dailyState.entry = true;
        ticket.dailyScans.set(todayStr, dailyState);
        ticket.markModified('dailyScans');

        ticket.isScanned = true;
        ticket.status = 'used';
        ticket.scannedAt = new Date();
        ticket.lastScanDate = new Date();
        ticket.entryScanned = true;
        ticket.entryScannedAt = new Date();
        
        await ticket.save();

        syncTicketToFirebase(ticket.eventId, ticket._id, {
            isScanned: true,
            entryScanned: true
        });

        res.status(200).json({
            success: true,
            message: 'Entry marked successfully',
            isScanned: true
        });
    } catch (err) {
        console.error("Entry Access Update Error:", err);
        res.status(500).json({ success: false, message: 'Server Error during entry update' });
    }
};

// @desc    Update Food Access for Ticket
// @route   POST /api/v1/tickets/update-food
// @access  Private (Staff/Admin)
exports.updateFoodAccess = async (req, res) => {
    try {
        const { ticketId } = req.body;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(ticketId)) {
            query = { _id: ticketId };
        } else {
            query = { $or: [{ uuid: ticketId }, { ticketCode: ticketId }] };
        }

        const ticket = await Ticket.findOne(query).populate('event');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (ticket.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Ticket has been cancelled' });
        }

        if (req.user.role === 'staff') {
            const event = ticket.event;
            if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
            let isAssigned = false;
            if (req.user.createdBy && event.organizer && req.user.createdBy.toString() === event.organizer.toString()) isAssigned = true;
            else if (req.user.assignedEvents && req.user.assignedEvents.includes(event._id)) isAssigned = true;
            if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this event' });
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (!ticket.dailyScans) ticket.dailyScans = new Map();
        if (!ticket.dailyScans.has(todayStr)) ticket.dailyScans.set(todayStr, { entry: false, food: false, parking: false, addons: {} });
        
        const dailyState = ticket.dailyScans.get(todayStr);
        if (dailyState.food) {
            return res.status(400).json({ success: false, message: 'Food already claimed today' });
        }
        dailyState.food = true;
        ticket.dailyScans.set(todayStr, dailyState);
        ticket.markModified('dailyScans');

        ticket.foodTaken = true;
        await ticket.save();

        syncTicketToFirebase(ticket.eventId, ticket._id, {
            foodTaken: true
        });

        res.status(200).json({
            success: true,
            message: 'Food marked as taken successfully',
            foodTaken: true
        });
    } catch (err) {
        console.error("Food Access Update Error:", err);
        res.status(500).json({ success: false, message: 'Server Error during food status update' });
    }
};

// @desc    Update Parking Access for Ticket
// @route   POST /api/v1/tickets/update-parking
// @access  Private (Staff/Admin)
exports.updateParkingAccess = async (req, res) => {
    try {
        const { ticketId } = req.body;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(ticketId)) {
            query = { _id: ticketId };
        } else {
            query = { $or: [{ uuid: ticketId }, { ticketCode: ticketId }] };
        }

        const ticket = await Ticket.findOne(query).populate('event');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (ticket.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Ticket has been cancelled' });
        }

        if (req.user.role === 'staff') {
            const event = ticket.event;
            if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
            let isAssigned = false;
            if (req.user.createdBy && event.organizer && req.user.createdBy.toString() === event.organizer.toString()) isAssigned = true;
            else if (req.user.assignedEvents && req.user.assignedEvents.includes(event._id)) isAssigned = true;
            if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this event' });
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (!ticket.dailyScans) ticket.dailyScans = new Map();
        if (!ticket.dailyScans.has(todayStr)) ticket.dailyScans.set(todayStr, { entry: false, food: false, parking: false, addons: {} });
        
        const dailyState = ticket.dailyScans.get(todayStr);
        if (dailyState.parking) {
            return res.status(400).json({ success: false, message: 'Parking already used today' });
        }
        dailyState.parking = true;
        ticket.dailyScans.set(todayStr, dailyState);
        ticket.markModified('dailyScans');

        ticket.parkingUsed = true;
        await ticket.save();

        syncTicketToFirebase(ticket.eventId, ticket._id, {
            parkingUsed: true
        });

        res.status(200).json({
            success: true,
            message: 'Parking marked as used successfully',
            parkingUsed: true
        });
    } catch (err) {
        console.error("Parking Access Update Error:", err);
        res.status(500).json({ success: false, message: 'Server Error during parking status update' });
    }
};

// @desc    Update Addon Access for Ticket
// @route   POST /api/v1/tickets/update-addons
// @access  Private (Staff/Admin)
exports.updateAddonsAccess = async (req, res) => {
    try {
        const { ticketId, itemName } = req.body;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(ticketId)) {
            query = { _id: ticketId };
        } else {
            query = { $or: [{ uuid: ticketId }, { ticketCode: ticketId }] };
        }

        const ticket = await Ticket.findOne(query).populate('event');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (ticket.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Ticket has been cancelled' });
        }

        if (req.user.role === 'staff') {
            const event = ticket.event;
            if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
            let isAssigned = false;
            if (req.user.createdBy && event.organizer && req.user.createdBy.toString() === event.organizer.toString()) isAssigned = true;
            else if (req.user.assignedEvents && req.user.assignedEvents.includes(event._id)) isAssigned = true;
            if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this event' });
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (!ticket.dailyScans) ticket.dailyScans = new Map();
        if (!ticket.dailyScans.has(todayStr)) ticket.dailyScans.set(todayStr, { entry: false, food: false, parking: false, addons: {} });
        
        const dailyState = ticket.dailyScans.get(todayStr);
        if (!dailyState.addons) dailyState.addons = {};
        if (dailyState.addons[itemName]) {
            return res.status(400).json({ success: false, message: `${itemName} already claimed today` });
        }
        dailyState.addons[itemName] = true;
        ticket.dailyScans.set(todayStr, dailyState);
        ticket.markModified('dailyScans');

        if (!ticket.addonStatuses) ticket.addonStatuses = new Map();
        ticket.addonStatuses.set(itemName, true);
        await ticket.save();

        const statuses = Object.fromEntries(ticket.addonStatuses);

        syncTicketToFirebase(ticket.eventId, ticket._id, {
            addonStatuses: statuses
        });

        res.status(200).json({
            success: true,
            message: `${itemName} marked as claimed successfully`,
            addonStatuses: statuses
        });
    } catch (err) {
        console.error("Addon Access Update Error:", err);
        res.status(500).json({ success: false, message: 'Server Error during addon status update' });
    }
};

exports.getMyScans = async (req, res) => {
    try {
        const staffId = req.user.id || req.user._id;
        const accessCode = req.user.assignedAccessCode || 'ENTRY';

        let accessName = 'Entry';
        if (accessCode !== 'ENTRY') {
            const User = require('../models/User');
            const organizer = await User.findById(req.user.createdBy).lean();
            if (organizer && organizer.operationalAddons) {
                const addon = organizer.operationalAddons.find(a => a.addonCode === accessCode);
                if (addon) accessName = addon.name;
                else accessName = accessCode;
            } else {
                accessName = accessCode;
            }
        }

        const ScanLog = require('../models/ScanLog');
        const logs = await ScanLog.find({ staffId })
            .populate('ticketId', 'name amountPaid totalAmount ticketType')
            .populate('eventId', 'title')
            .sort({ scannedAt: -1 })
            .limit(100)
            .lean();

        let myScans = logs.map(log => ({
            name: log.ticketId?.name || "Attendee",
            event: log.eventId?.title || "Event",
            status: "GRANTED",
            reason: "Valid Ticket",
            time: new Date(log.scannedAt).toLocaleTimeString(),
            paid: log.ticketId?.amountPaid || 0,
            total: log.ticketId?.totalAmount || 0,
            selectedPlan: log.ticketId?.ticketType || "Standard",
            scanTimestamp: new Date(log.scannedAt).getTime()
        }));

        res.status(200).json({ success: true, accessName, data: myScans });
    } catch (err) {
        console.error("getMyScans Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


