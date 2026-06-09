const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const ScanLog = require('../models/ScanLog');


// @desc    Get per-event attendee list (for organizer event dashboard)
// @route   GET /api/v1/analytics/event/:eventId/attendees
// @access  Private (Organizer / Admin)
exports.getEventAttendees = async (req, res) => {
    try {
        const { eventId } = req.params;

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ success: false, message: 'Invalid Event ID' });
        }

        // Verify event exists and belongs to the requesting organizer (or admin)
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const isOrganizer = true; // Single event system: organizer has global access
        const isAdmin = req.user.role === 'admin';

        const bookings = await Booking.find({
            event: eventId,
            paymentStatus: { $in: ['completed', 'partial'] }
        }).populate('user', 'name email phone').sort({ createdAt: -1 });

        // Optimize: Fetch all tickets for these bookings in ONE query
        const bookingIds = bookings.map(b => b._id);
        const tickets = await Ticket.find({ booking: { $in: bookingIds } });
        const ticketMap = tickets.reduce((acc, t) => {
            acc[t.booking.toString()] = t;
            return acc;
        }, {});

        const Payment = require('../models/Payment');
        const payments = await Payment.find({ bookingId: { $in: bookingIds }, status: 'SUCCESS' }).lean();
        const paymentMap = {};
        payments.forEach(p => {
            if (!paymentMap[p.bookingId.toString()]) paymentMap[p.bookingId.toString()] = [];
            paymentMap[p.bookingId.toString()].push(p);
        });

        const enriched = bookings.map((booking) => {
            const ticket = ticketMap[booking._id.toString()];
            return {
                ...booking.toObject(),
                checkedIn: ticket ? ticket.scannedStatus : false,
                scannedAt: ticket ? ticket.scannedAt : null,
                ticketId: ticket ? ticket._id : null,
                verifiedPayments: paymentMap[booking._id.toString()] || []
            };
        });

        res.status(200).json({
            success: true,
            count: enriched.length,
            data: enriched
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getOrganizerStats = async (req, res) => {
    try {
        const organizerId = req.user.id || req.user._id;
        const mongoose = require('mongoose');

        // Find all events owned by this organizer
        const myEvents = await Event.find({ organizer: organizerId }).select('_id').lean();
        const myEventIds = myEvents.map(e => e._id);

        const eventStats = await Event.aggregate([
                { $match: { organizer: new mongoose.Types.ObjectId(organizerId) } },
                { $facet: {
                    total:    [{ $count: 'n' }],
                    approved: [{ $match: { status: { $in: ['approved', 'live'] } } }, { $count: 'n' }],
                    capacity: [{ $unwind: '$ticketTypes' }, { $group: { _id: null, total: { $sum: '$ticketTypes.quantity' } } }]
                }}
            ]);
        const Payment = require('../models/Payment');
        
        const myBookings = await Booking.find({ event: { $in: myEventIds } }).select('_id').lean();
        const myBookingIds = myBookings.map(b => b._id);
        
        const paymentsStats = await Payment.aggregate([
            { $match: { bookingId: { $in: myBookingIds } } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                revenue: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, '$amount', 0] } }
            }}
        ]);
        
        let successfulPayments = 0;
        let failedPayments = 0;
        let refunds = 0;
        let totalRevenuePaise = 0;
        
        paymentsStats.forEach(stat => {
            if (stat._id === 'SUCCESS') {
                successfulPayments = stat.count;
                totalRevenuePaise = stat.revenue;
            } else if (stat._id === 'FAILED') {
                failedPayments = stat.count;
            } else if (stat._id === 'REFUNDED') {
                refunds = stat.count;
            }
        });

        const stats = eventStats[0] || { total: [], approved: [], capacity: [] };

        res.status(200).json({
            success: true,
            data: {
                totalEvents:      stats.total?.[0]?.n || 0,
                approvedEvents:   stats.approved?.[0]?.n || 0,
                totalCapacity:    stats.capacity?.[0]?.total || 0,
                totalRevenue:     totalRevenuePaise / 100, // Verified from Payment
                successfulPayments,
                failedPayments,
                refunds
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get platform-wide admin analytics
// @route   GET /api/v1/analytics/admin
// @access  Private (Admin)
exports.getAdminStats = async (req, res) => {
    try {
        const Enquiry = require('../models/Enquiry');
        const Expense = require('../models/Expense');

        const [
            totalOrganizers,
            totalStaff,
            totalEvents,
            totalEnquiries,
            ticketsAgg,
            revenueAgg,
            expensesAgg,
            scans,
            recentBookings
        ] = await Promise.all([
            User.countDocuments({ role: 'organizer' }),
            User.countDocuments({ role: 'staff' }),
            Event.countDocuments({}),
            Enquiry.countDocuments({ isRead: false }),
            Booking.aggregate([
                { $match: { paymentStatus: { $in: ['completed', 'partial'] } } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]),
            Payment.aggregate([
                { $match: { status: 'SUCCESS' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            Expense.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            ScanLog.find({})
                .sort({ scannedAt: -1 })
                .limit(5)
                .populate({ path: 'ticketId', select: 'name ticketCode' })
                .populate('staffId', 'name')
                .lean(),
            Booking.find({ paymentStatus: { $in: ['completed', 'partial'] } })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('user', 'name')
                .lean()
        ]);

        const totalTicketsSold = ticketsAgg[0]?.total || 0;
        const totalRevenue = (revenueAgg[0]?.total || 0) / 100;
        const totalExpenses = expensesAgg[0]?.total || 0;
        const totalProfit = Math.max(0, totalRevenue - totalExpenses);

        const activities = [];
        scans.forEach(s => {
            activities.push({
                message: `Scan: ${s.ticketId?.name || 'Guest'} (${s.ticketId?.ticketCode || 'N/A'}) - status ${s.status}`,
                time: s.scannedAt,
                type: 'scan'
            });
        });
        recentBookings.forEach(b => {
            activities.push({
                message: `Booking: ${b.user?.name || 'Guest'} bought ${b.quantity} tickets - ${b.paymentStatus}`,
                time: b.createdAt,
                type: 'booking'
            });
        });
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.status(200).json({
            success: true,
            data: {
                totalOrganizers,
                totalStaff,
                totalEvents,
                totalTicketsSold,
                totalRevenue,
                totalProfit,
                totalEnquiries,
                activities: activities.slice(0, 10)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStaffStats = async (req, res) => {
    try {
        const staffId = req.user.id || req.user._id;

        // Total lifetime scans
        const scans = await ScanLog.countDocuments({
            staffId: staffId,
            status: 'success'
        });

        // Today's scans
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todayScans = await ScanLog.countDocuments({
            staffId: staffId,
            status: 'success',
            scannedAt: { $gte: startOfToday }
        });

        // Recent Scans (last 10) with limited attendee details
        const recentScans = await ScanLog.find({
            staffId: staffId,
            status: 'success'
        })
        .sort({ scannedAt: -1 })
        .limit(10)
        .populate({
            path: 'ticketId',
            select: 'name ticketCode ticketType status'
        });

        const user = await User.findById(staffId).populate('assignedEvents');
        const activeEventsCount = (user?.assignedEvents || []).filter(e => e.status === 'live').length;

        res.status(200).json({
            success: true,
            data: {
                totalScans: scans,
                todayScans: todayScans,
                recentScans: recentScans.map(log => ({
                    attendee: log.ticketId?.name || 'Guest',
                    code: log.ticketId?.ticketCode || 'N/A',
                    type: log.ticketId?.ticketType || 'General',
                    time: log.scannedAt
                })),
                activeEventsCount: activeEventsCount || 0,
                staffRole: user?.staffRole || 'Operations'
            }
        });
    } catch (err) {
        console.error("Staff Stats Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

