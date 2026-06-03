// Razorpay dependency removed
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createTicketAfterPayment } = require('./ticketController');
const { sendBookingConfirmation } = require('../services/emailService');
const { generateTicketPDF } = require('../services/pdfService');

// Safe Demo Order Generation (Razorpay removed)
const generateDemoOrder = (amount) => ({
    id: "demo_" + Date.now(),
    amount: amount * 100,
    currency: 'INR'
});

// @desc    Initiate Checkout
// @route   POST /api/v1/bookings/checkout
exports.checkout = async (req, res) => {
    try {
        const { eventId, ticketType, quantity, attendeeDetails, partialAmount, contactEmail } = req.body;
        if (!eventId || !ticketType || !quantity) return res.status(400).json({ success: false, message: "Missing fields" });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: "Event not found" });

        let totalAmount = 0;
        let selectedDatesArray = [];

        // MULTI-DAY PRICE RESOLUTION
        if (event.isMultiDay && (req.body.selectedDays?.length > 0 || req.body.selectedDate)) {
            const daysToProcess = req.body.selectedDays && req.body.selectedDays.length > 0 
                ? req.body.selectedDays 
                : [req.body.selectedDate];
            
            selectedDatesArray = daysToProcess;

            for (const reqDateStr of daysToProcess) {
                const reqDate = new Date(reqDateStr).toDateString();
                const day = event.multiDayPlan.find(d => new Date(d.date).toDateString() === reqDate);
                if (!day) return res.status(400).json({ success: false, message: "Invalid event date selected" });
                
                // Use plan name from selectedPlans if available, otherwise fallback to ticketType
                const planName = (req.body.selectedPlans && req.body.selectedPlans[reqDateStr]) || ticketType;
                const dayTier = day.plans.find(p => p.name === planName);
                if (!dayTier) return res.status(400).json({ success: false, message: `Invalid plan (${planName}) for date ${reqDateStr}` });
                
                totalAmount += dayTier.price * parseInt(quantity);
            }
        } else {
            const tier = event.ticketTypes.find(t => t.name === ticketType);
            if (!tier) return res.status(400).json({ success: false, message: "Invalid ticket type" });
            totalAmount = tier.price * parseInt(quantity);
        }

        // FOOD PRICE RESOLUTION
        let foodCost = 0;
        if (req.body.selectedFood && Array.isArray(req.body.selectedFood)) {
            req.body.selectedFood.forEach(item => {
                const option = event.foodSettings?.options?.find(opt => opt.itemName === item.itemName);
                if (option) {
                    foodCost += (option.price || 0) * (item.quantity || quantity);
                }
            });
        }
        totalAmount += foodCost;

        // ADDON PRICE RESOLUTION
        let addonsCost = 0;
        if (req.body.selectedAddons && Array.isArray(req.body.selectedAddons)) {
            req.body.selectedAddons.forEach(item => {
                const option = event.addonsSettings?.options?.find(opt => opt.itemName === item.itemName);
                if (option) {
                    addonsCost += (option.price || 0) * (item.quantity || quantity);
                }
            });
        }
        totalAmount += addonsCost;

        const paymentAmount = partialAmount ? parseFloat(partialAmount) : totalAmount;
        const order = generateDemoOrder(paymentAmount);

        let userId;
        const emailToUse = contactEmail || (attendeeDetails && attendeeDetails.length > 0 ? attendeeDetails[0].email : null);
        if (req.user) {
            userId = req.user.id;
        } else {
            if (!emailToUse) {
                return res.status(400).json({ success: false, message: "Email is required for checkout" });
            }
            let user = await User.findOne({ email: emailToUse });
            if (!user) {
                user = await User.create({
                    name: (attendeeDetails && attendeeDetails.length > 0) ? attendeeDetails[0].name : 'Guest Attendee',
                    email: emailToUse,
                    role: 'attendee',
                    password: crypto.randomBytes(10).toString('hex'),
                    phone: (attendeeDetails && attendeeDetails.length > 0) ? attendeeDetails[0].phone : undefined,
                    address: req.body.address,
                    city: req.body.city,
                    state: req.body.state,
                    companyName: req.body.companyName,
                    designation: req.body.designation,
                    heardAboutUs: req.body.heardAboutUs,
                    reference: req.body.reference,
                    selectedIndustries: req.body.selectedIndustries
                });
            } else if (req.body.address || req.body.companyName) {
                user.address = req.body.address || user.address;
                user.city = req.body.city || user.city;
                user.state = req.body.state || user.state;
                user.companyName = req.body.companyName || user.companyName;
                user.designation = req.body.designation || user.designation;
                user.heardAboutUs = req.body.heardAboutUs || user.heardAboutUs;
                user.reference = req.body.reference || user.reference;
                if (req.body.selectedIndustries) user.selectedIndustries = req.body.selectedIndustries;
                await user.save();
            }
            userId = user._id;
        }

        const bookingData = {
            user: userId,
            event: eventId,
            ticketType,
            selectedPlans: req.body.selectedPlans,
            selectedDate: selectedDatesArray.length > 0 ? selectedDatesArray[0] : event.date,
            selectedDays: selectedDatesArray,
            quantity: parseInt(quantity),
            totalAmount,
            orderId: order.id,
            paymentStatus: 'pending',
            contactEmail: emailToUse,
            attendeeDetails: attendeeDetails || [{ name: 'Guest', email: emailToUse }],
            selectedFood: req.body.selectedFood || [],
            selectedAddons: req.body.selectedAddons || []
        };

        const booking = await Booking.create(bookingData);
        res.status(200).json({ success: true, order, bookingId: booking._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Verify Payment & Finalize Booking (DEPRECATED - Moved to paymentController)
// @route   POST /api/v1/bookings/verify
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, amount } = req.body;
        const result = await exports.finalizeBookingInternally(bookingId, amount, razorpay_payment_id, razorpay_order_id);
        res.status(200).json({ success: true, message: "Booking successful", ticketId: result.ticketId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * INTERNAL METHOD: Finalize booking, generate tickets, update inventory.
 * MUST ONLY be called AFTER cryptographic signature verification passes.
 */
exports.finalizeBookingInternally = async (bookingId, amountFromOrder, razorpay_payment_id, razorpay_order_id) => {
    // ATOMIC LOCK: Only proceed if it is strictly pending.
    // Transition to processing state to block concurrent webhooks/frontend verifications
    const booking = await Booking.findOneAndUpdate(
        { _id: bookingId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'processing' } },
        { new: true }
    ).populate('event', 'title date venue bannerImage foodSettings addonsSettings isMultiDay multiDayPlan ticketTypes organizer');

    if (!booking) {
        throw new Error("Booking already processed, not found, or invalid state");
    }

    amountFromOrder = amountFromOrder || booking.totalAmount;

    booking.amountPaid = (booking.amountPaid || 0) + parseFloat(amountFromOrder);
    booking.paymentStatus = booking.amountPaid >= booking.totalAmount ? 'completed' : 'partial';
    
    booking.payments.push({
        amount: parseFloat(amountFromOrder),
        paymentId: razorpay_payment_id || "DEMO_PAY_" + Date.now(),
        orderId: razorpay_order_id,
        date: new Date()
    });

    // ATOMIC INVENTORY UPDATE
    const quantityToBuy = booking.quantity || 1;
    
    if (booking.event.isMultiDay && booking.selectedDays?.length > 0) {
        const updatedDays = [];
        try {
            for (const dayDate of booking.selectedDays) {
                const planName = (booking.selectedPlans && booking.selectedPlans[dayDate]) || booking.ticketType;
                
                const eventDoc = await Event.findById(booking.event._id);
                const day = eventDoc.multiDayPlan.find(d => new Date(d.date).toDateString() === new Date(dayDate).toDateString());
                if (!day) throw new Error("Invalid date");
                const dayTier = day.plans.find(p => p.name === planName);
                if (!dayTier) throw new Error("Plan not found");

                const updateRes = await Event.findOneAndUpdate(
                    { 
                        _id: booking.event._id, 
                        "multiDayPlan": {
                            $elemMatch: {
                                date: new Date(dayDate),
                                "plans": { 
                                    $elemMatch: { 
                                        name: planName,
                                        sold: { $lte: dayTier.quantity - quantityToBuy }
                                    } 
                                }
                            }
                        }
                    },
                    { $inc: { "multiDayPlan.$[day].plans.$[plan].sold": quantityToBuy } },
                    { 
                        arrayFilters: [ { "day.date": new Date(dayDate) }, { "plan.name": planName } ],
                        new: true 
                    }
                );
                if (!updateRes) {
                    throw new Error(`Sold out or invalid plan for date ${new Date(dayDate).toDateString()}`);
                }
                updatedDays.push({ dayDate, planName });
            }
        } catch (err) {
            for (const updated of updatedDays) {
                await Event.findOneAndUpdate(
                    { _id: booking.event._id },
                    { $inc: { "multiDayPlan.$[day].plans.$[plan].sold": -quantityToBuy } },
                    { arrayFilters: [ { "day.date": new Date(updated.dayDate) }, { "plan.name": updated.planName } ] }
                );
            }
            throw err;
        }
    } else {
        const eventDoc = await Event.findById(booking.event._id);
        const tier = eventDoc.ticketTypes.find(t => t.name === booking.ticketType);
        if (!tier) throw new Error("Ticket tier not found");

        const updateRes = await Event.findOneAndUpdate(
            { 
                _id: booking.event._id, 
                "ticketTypes": { 
                    $elemMatch: { 
                        name: booking.ticketType,
                        sold: { $lte: tier.quantity - quantityToBuy }
                    } 
                }
            },
            { $inc: { "ticketTypes.$[tier].sold": quantityToBuy } },
            { arrayFilters: [ { "tier.name": booking.ticketType } ], new: true }
        );
        if (!updateRes) throw new Error("This ticket tier is now sold out.");
    }

    await booking.save();

    console.log(`[PDF] Generating tickets for booking ${booking._id}...`);
    const ticket = await createTicketAfterPayment(booking._id, booking.event._id, booking.user);
    console.log(`✅ [PDF] Primary ticket generated successfully: ${ticket._id}`);

    booking.ticketId = ticket._id;
    await booking.save();

    const Ticket = require('../models/Ticket');
    const tickets = await Ticket.find({ booking: booking._id });

    const { ticketQueue } = require('../queue/ticketQueue');
    for (const t of tickets) {
        await ticketQueue.add('generateAndSendTicket', { ticketId: t._id });
    }

    const { scheduleReminders } = require('../queue/notificationQueue');
    await scheduleReminders(booking.user, booking.event._id, booking.event.date);

    try {
        const notifType = booking.paymentStatus === 'completed' ? 'booking_confirmed' : 'system';
        const notifTitle = booking.paymentStatus === 'completed' ? 'Full Payment Received & Ticket Booked' : 'Partial Payment Received & Ticket Booked';
        await Notification.create({
            user: booking.event.organizer,
            title: notifTitle,
            message: `An attendee just booked a ticket for ${booking.event.title}. Amount Paid: ₹${amountFromOrder}.`,
            type: notifType,
            eventId: booking.event._id
        });
    } catch (notifErr) {
        console.error("Failed to create organizer notification:", notifErr);
    }

    return { success: true, ticketId: ticket._id };
};

// @desc    Demo Booking (Bypass Payment)
// @route   POST /api/v1/bookings/demo-book
exports.demoBooking = async (req, res) => {
    try {
        const { eventId, ticketType, quantity, attendeeDetails, partialAmount, contactEmail } = req.body;
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: "Event not found" });

        let tier;
        let totalAmount = 0;
        let selectedDatesArray = [];
        let tiersToUpdate = [];

        // MULTI-DAY PRICE RESOLUTION
        if (event.isMultiDay && (req.body.selectedDays?.length > 0 || req.body.selectedDate)) {
            const daysToProcess = req.body.selectedDays && req.body.selectedDays.length > 0 
                ? req.body.selectedDays 
                : [req.body.selectedDate];
            
            selectedDatesArray = daysToProcess;

            for (const reqDateStr of daysToProcess) {
                const reqDate = new Date(reqDateStr).toDateString();
                const day = event.multiDayPlan.find(d => new Date(d.date).toDateString() === reqDate);
                if (!day) return res.status(400).json({ success: false, message: "Invalid event date selected" });
                
                // Use plan name from selectedPlans if available, otherwise fallback to ticketType
                const planName = (req.body.selectedPlans && req.body.selectedPlans[reqDateStr]) || ticketType;
                const dayTier = day.plans.find(p => p.name === planName);
                if (!dayTier) return res.status(400).json({ success: false, message: `Invalid plan (${planName}) for date ${reqDateStr}` });
                
                totalAmount += dayTier.price * parseInt(quantity);
                tiersToUpdate.push(dayTier);
            }
        } else {
            tier = event.ticketTypes.find(t => t.name === ticketType);
            if (!tier) return res.status(400).json({ success: false, message: "Invalid ticket type" });
            totalAmount = tier.price * parseInt(quantity);
            tiersToUpdate.push(tier);
        }

        // FOOD PRICE RESOLUTION
        let foodCost = 0;
        if (req.body.selectedFood && Array.isArray(req.body.selectedFood)) {
            req.body.selectedFood.forEach(item => {
                const option = event.foodSettings?.options?.find(opt => opt.itemName === item.itemName);
                if (option) {
                    foodCost += (option.price || 0) * (item.quantity || quantity);
                }
            });
        }
        totalAmount += foodCost;

        // ADDON PRICE RESOLUTION
        let addonsCost = 0;
        if (req.body.selectedAddons && Array.isArray(req.body.selectedAddons)) {
            req.body.selectedAddons.forEach(item => {
                const option = event.addonsSettings?.options?.find(opt => opt.itemName === item.itemName);
                if (option) {
                    addonsCost += (option.price || 0) * (item.quantity || quantity);
                }
            });
        }
        totalAmount += addonsCost;

        const paid = (partialAmount && !isNaN(parseFloat(partialAmount))) ? parseFloat(partialAmount) : totalAmount;

        let userId;
        const emailToUse = contactEmail || (attendeeDetails && attendeeDetails.length > 0 ? attendeeDetails[0].email : null);
        if (req.user) {
            userId = req.user.id;
        } else {
            if (!emailToUse) {
                return res.status(400).json({ success: false, message: "Email is required for checkout" });
            }
            let user = await User.findOne({ email: emailToUse });
            if (!user) {
                user = await User.create({
                    name: (attendeeDetails && attendeeDetails.length > 0) ? attendeeDetails[0].name : 'Guest Attendee',
                    email: emailToUse,
                    role: 'attendee',
                    password: crypto.randomBytes(10).toString('hex'),
                    phone: (attendeeDetails && attendeeDetails.length > 0) ? attendeeDetails[0].phone : undefined,
                    address: req.body.address,
                    city: req.body.city,
                    state: req.body.state,
                    companyName: req.body.companyName,
                    designation: req.body.designation,
                    heardAboutUs: req.body.heardAboutUs,
                    reference: req.body.reference,
                    selectedIndustries: req.body.selectedIndustries
                });
            } else if (req.body.address || req.body.companyName) {
                user.address = req.body.address || user.address;
                user.city = req.body.city || user.city;
                user.state = req.body.state || user.state;
                user.companyName = req.body.companyName || user.companyName;
                user.designation = req.body.designation || user.designation;
                user.heardAboutUs = req.body.heardAboutUs || user.heardAboutUs;
                user.reference = req.body.reference || user.reference;
                if (req.body.selectedIndustries) user.selectedIndustries = req.body.selectedIndustries;
                await user.save();
            }
            userId = user._id;
        }

        const booking = await Booking.create({
            user: userId,
            event: eventId,
            ticketType,
            selectedPlans: req.body.selectedPlans,
            selectedDate: selectedDatesArray.length > 0 ? selectedDatesArray[0] : event.date,
            selectedDays: selectedDatesArray,
            quantity: parseInt(quantity),
            totalAmount,
            amountPaid: paid,
            orderId: "DEMO_ORDER_" + Date.now(),
            paymentId: "DEMO_PAY_" + Date.now(),
            paymentStatus: paid >= totalAmount ? 'completed' : 'partial',
            contactEmail: emailToUse,
            attendeeDetails: attendeeDetails || [{ name: 'Guest', email: emailToUse }],
            selectedFood: req.body.selectedFood || [],
            selectedAddons: req.body.selectedAddons || []
        });

        // ATOMIC INVENTORY UPDATE (Same logic as verifyPayment)
        const quantityToBuy = parseInt(quantity);
        if (event.isMultiDay && selectedDatesArray.length > 0) {
            for (const dayDate of selectedDatesArray) {
                const planName = (req.body.selectedPlans && req.body.selectedPlans[dayDate]) || ticketType;
                
                const eventDoc = await Event.findById(eventId);
                const day = eventDoc.multiDayPlan.find(d => new Date(d.date).toDateString() === new Date(dayDate).toDateString());
                if (!day) throw new Error("Invalid date");
                const dayTier = day.plans.find(p => p.name === planName);
                if (!dayTier) throw new Error("Plan not found");

                const updateRes = await Event.findOneAndUpdate(
                    { 
                        _id: eventId, 
                        "multiDayPlan": {
                            $elemMatch: {
                                date: new Date(dayDate),
                                "plans": { 
                                    $elemMatch: { 
                                        name: planName,
                                        sold: { $lte: dayTier.quantity - quantityToBuy }
                                    } 
                                }
                            }
                        }
                    },
                    { $inc: { "multiDayPlan.$[day].plans.$[plan].sold": quantityToBuy } },
                    { arrayFilters: [ { "day.date": new Date(dayDate) }, { "plan.name": planName } ], new: true }
                );
                if (!updateRes) throw new Error(`Sold out for date ${dayDate}`);
            }
        } else {
            const eventDoc = await Event.findById(eventId);
            const tier = eventDoc.ticketTypes.find(t => t.name === ticketType);
            if (!tier) throw new Error("Ticket tier not found");

            const updateRes = await Event.findOneAndUpdate(
                { 
                    _id: eventId, 
                    "ticketTypes": { 
                        $elemMatch: { 
                            name: ticketType,
                            sold: { $lte: tier.quantity - quantityToBuy }
                        } 
                    }
                },
                { $inc: { "ticketTypes.$[tier].sold": quantityToBuy } },
                { arrayFilters: [ { "tier.name": ticketType } ], new: true }
            );
            if (!updateRes) throw new Error("This ticket tier is now sold out.");
        }

        const ticket = await createTicketAfterPayment(booking._id, eventId, booking.user);

        // Save ticket link
        booking.ticketId = ticket._id;
        await booking.save();

        // Retrieve all tickets created for this booking
        const Ticket = require('../models/Ticket');
        const tickets = await Ticket.find({ booking: booking._id });

        // Queue all tickets for background PDF generation & dispatch
        const { ticketQueue } = require('../queue/ticketQueue');
        for (const t of tickets) {
            await ticketQueue.add('generateAndSendTicket', { ticketId: t._id });
        }

        // Queue Event Reminders
        const { scheduleReminders } = require('../queue/notificationQueue');
        await scheduleReminders(userId, eventId, event.date);

        // CREATE NOTIFICATION FOR ORGANIZER
        try {
            const notifType = booking.paymentStatus === 'completed' ? 'booking_confirmed' : 'system';
            const notifTitle = booking.paymentStatus === 'completed' ? 'Full Payment Received & Ticket Booked' : 'Partial Payment Received & Ticket Booked';
            await Notification.create({
                user: event.organizer,
                title: notifTitle,
                message: `An attendee just booked a ticket for ${event.title}. Amount Paid: ₹${paid}.`,
                type: notifType,
                eventId: event._id
            });
        } catch (notifErr) {
            console.error("Failed to create organizer notification:", notifErr);
        }

        res.status(200).json({ 
            success: true, 
            message: "Success! Ticket sent to email", 
            bookingId: booking._id, 
            ticketId: ticket._id 
        });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate('event', 'title date venue bannerImage')
            .sort({ createdAt: -1 })
            .lean({ virtuals: true });
        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Initiate Installment Payment
// @route   POST /api/v1/bookings/:id/installment
exports.initiateInstallment = async (req, res) => {
    try {
        const { amount } = req.body;
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

        const remaining = booking.totalAmount - booking.amountPaid;
        if (amount > remaining) return res.status(400).json({ success: false, message: `Amount exceeds remaining balance of ${remaining}` });

        const order = generateDemoOrder(amount);

        res.status(200).json({ success: true, order, bookingId: booking._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Verify Installment Payment (DEPRECATED - Moved to paymentController)
// @route   POST /api/v1/bookings/verify-installment
exports.verifyInstallment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, bookingId, amount } = req.body;
        const result = await exports.finalizeInstallmentInternally(bookingId, amount, razorpay_payment_id, razorpay_order_id);
        res.status(200).json({ 
            success: true, 
            message: "Payment updated", 
            amountPaid: result.amountPaid,
            ticketId: result.ticketId 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * INTERNAL METHOD: Finalize installment, generate tickets.
 * MUST ONLY be called AFTER cryptographic signature verification passes.
 */
exports.finalizeInstallmentInternally = async (bookingId, amount, razorpay_payment_id, razorpay_order_id) => {
    // ATOMIC LOCK: Only proceed if it is strictly partial.
    // Transition to processing state to block concurrent webhooks/frontend verifications
    const booking = await Booking.findOneAndUpdate(
        { _id: bookingId, paymentStatus: 'partial' },
        { $set: { paymentStatus: 'processing_installment' } },
        { new: true }
    ).populate('event', 'title date venue bannerImage organizer');

    if (!booking) {
        throw new Error("Booking already processed, not found, or invalid state");
    }

    booking.amountPaid = (booking.amountPaid || 0) + parseFloat(amount);
    booking.paymentStatus = booking.amountPaid >= booking.totalAmount ? 'completed' : 'partial';
    
    booking.payments.push({
        amount: parseFloat(amount),
        paymentId: razorpay_payment_id || "DEMO_PAY_" + Date.now(),
        orderId: razorpay_order_id,
        date: new Date()
    });

    console.log(`✅ [PAYMENT] Installment Verified! Amount: ${amount}, Booking: ${bookingId}`);
    await booking.save();

    const Ticket = require('../models/Ticket');
    const tickets = await Ticket.find({ booking: booking._id });
    for (const t of tickets) {
        t.amountPaid = booking.amountPaid;
        t.paymentStatus = booking.paymentStatus === 'completed' ? 'PAID' : 'PARTIAL';
        await t.save();
    }

    if (booking.paymentStatus === 'completed') {
        const { ticketQueue } = require('../queue/ticketQueue');
        for (const t of tickets) {
            await ticketQueue.add('generateAndSendTicket', { ticketId: t._id });
        }
    }

    try {
        const notifType = booking.paymentStatus === 'completed' ? 'booking_confirmed' : 'system';
        const notifTitle = booking.paymentStatus === 'completed' ? 'Full Payment Completed' : 'Installment Received';
        await Notification.create({
            user: booking.event.organizer,
            title: notifTitle,
            message: `An attendee just paid an installment for ${booking.event.title}. Amount Paid: ₹${amount}.`,
            type: notifType,
            eventId: booking.event._id
        });
    } catch (notifErr) {
        console.error("Failed to create organizer notification:", notifErr);
    }

    return { 
        success: true, 
        amountPaid: booking.amountPaid,
        ticketId: booking.ticketId 
    };
};

// @desc    Resend Ticket Email
// @route   POST /api/v1/bookings/resend-ticket/:id
exports.resendTicketEmail = async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.id).populate('event', 'title date venue bannerImage');
        
        // Fallback: If not found, check if the ID provided is actually a Ticket ID
        if (!booking) {
            const ticket = await require('../models/Ticket').findById(req.params.id).populate({
                path: 'booking',
                populate: { path: 'event' }
            });
            if (ticket && ticket.booking) {
                booking = ticket.booking;
            }
        }

        if (!booking) return res.status(404).json({ success: false, message: "Booking or Ticket reference not found" });

        if (booking.paymentStatus !== 'completed') {
            return res.status(400).json({ success: false, message: "Payment not completed yet" });
        }

        const Ticket = require('../models/Ticket');
        const tickets = await Ticket.find({ booking: booking._id });
        if (tickets.length === 0) {
            return res.status(400).json({ success: false, message: "No ticket record found for this booking." });
        }

        const { ticketQueue } = require('../queue/ticketQueue');
        for (const t of tickets) {
            await ticketQueue.add('generateAndSendTicket', { ticketId: t._id });
        }

        res.status(200).json({ success: true, message: "Tickets queued for delivery successfully to " + (booking.contactEmail || req.user.email) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};