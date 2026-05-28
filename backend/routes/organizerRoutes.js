const express = require('express');
const {
    getStaff,
    createStaff,
    assignStaffToEvents,
    deleteStaff
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');

const Ticket = require('../models/Ticket');
const Expense = require('../models/Expense');
const Event = require('../models/Event');

const router = express.Router();

// All organizer routes require auth + organizer role
router.use(protect);

// --- ROUTES ACCESSIBLE BY BOTH ORGANIZER AND STAFF ---

router.get('/bookings', authorize('organizer', 'staff'), async (req, res) => {
    try {
        const Ticket = require('../models/Ticket');
        
        const organizerId = req.user.id || req.user._id;
        const allEvents = await Event.find({ organizer: organizerId }).select('_id').lean();
        const eventIds = allEvents.map(e => e._id);
        
        const tickets = await Ticket.find({ eventId: { $in: eventIds } })
            .populate('user', 'name email phone')
            .populate('event', 'title venue date isMultiDay multiDayPlan')
            .populate({
                path: 'booking',
                select: 'attendeeDetails selectedFood selectedAddons quantity totalAmount amountPaid'
            })
            .sort({ scannedAt: -1, createdAt: -1 })
            .lean();

        const mappedData = tickets.map(t => {
            const total = t.totalAmount || t.ticketPrice || 0;
            const paid = t.amountPaid || 0;
            const remaining = Math.max(0, total - paid);
            const duration = (t.event && t.event.isMultiDay) ? (t.event.isMultiDay && t.event.multiDayPlan?.length || 1) : 1;

            return {
                ...t,
                attendeeName: t.name || t.user?.name || "N/A",
                email: t.email || t.user?.email || "N/A",
                phone: t.mobileNumber || t.user?.phone || "N/A",
                eventName: t.eventName || t.event?.title || "N/A",
                ticketTier: t.ticketType || "N/A",
                totalAmount: total,
                amountPaid: paid,
                remainingAmount: remaining,
                paymentStatus: t.paymentStatus || (remaining <= 0 ? "PAID" : "PARTIAL"),
                bookingDate: t.bookedAt || t.createdAt,
                eventDate: t.event?.date,
                eventDurationDays: duration,
                validityText: `${duration} Day${duration > 1 ? 's' : ''}`,
                lastScanDate: t.lastScanDate || t.scannedAt,
                isUsed: t.status === 'used' || t.isScanned,
                ticketStatus: t.status,
                attendeeDetails: t.booking?.attendeeDetails || [],
                selectedFood: t.booking?.selectedFood || [],
                selectedAddons: t.booking?.selectedAddons || [],
                bookedQuantity: t.booking?.quantity || 1
            };
        });
            
        res.status(200).json({ success: true, count: mappedData.length, data: mappedData });
    } catch (err) {
        console.error("Staff Dashboard API Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- STAFF-ONLY ROUTES (Accessible to Staff Members) ---

// --- ROUTES ACCESSIBLE ONLY BY ORGANIZER ---
router.use(authorize('organizer'));

// Staff Management for Organizers
router.route('/staff')
    .get(getStaff)
    .post(createStaff);

router.route('/staff/:id')
    .delete(deleteStaff);



router.get("/event/:id/details", async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    const eventName = event ? event.title : 'Unknown Event';

    const tickets = await Ticket.find({ eventId: eventId });
    const expenses = await Expense.find({ eventId: eventId });

    const totalRevenue = tickets.reduce((sum, t) => sum + (t.ticketPrice || t.price || 0), 0);
    const totalTickets = tickets.length;
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const profit = totalRevenue - totalExpenses;

    const salesByDateMap = {};
    const planSalesMap = {};
    
    tickets.forEach(t => {
      const date = t.bookedAt || t.createdAt || new Date();
      const dateStr = new Date(date).toISOString().split('T')[0];
      if (!salesByDateMap[dateStr]) salesByDateMap[dateStr] = { date: dateStr, ticketsSold: 0, revenue: 0 };
      salesByDateMap[dateStr].ticketsSold += 1;
      salesByDateMap[dateStr].revenue += (t.ticketPrice || t.price || 0);
      
      const plan = t.ticketType || 'General';
      if (!planSalesMap[plan]) planSalesMap[plan] = { planName: plan, ticketsSold: 0, revenue: 0 };
      planSalesMap[plan].ticketsSold += 1;
      planSalesMap[plan].revenue += (t.ticketPrice || t.price || 0);
    });

    const salesByDate = Object.values(salesByDateMap);
    const planSales = Object.values(planSalesMap);

    res.json({
      eventName,
      totalTickets,
      totalRevenue,
      totalExpenses,
      profit,
      salesByDate,
      planSales,
      expenses
    });

    } catch (err) {
    console.error("❌ [ORGANIZER DETAILS ERROR]:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.get('/revenue', async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const now = new Date();
        const organizerId = req.user.id || req.user._id;

        // Find all events owned by this organizer
        const myEvents = await Event.find({ organizer: organizerId }).select('_id').lean();
        const myEventIds = myEvents.map(e => e._id);

        // Find completed events owned by this organizer
        const completedEvents = await Event.find({
            organizer: organizerId,
            endDate: { $lt: now }
        }).select('_id').lean();

        // Aggregate amountPaid for all of this organizer's events
        const revenueAgg = await Booking.aggregate([
            { $match: { event: { $in: myEventIds }, paymentStatus: { $in: ['partial', 'completed'] } } },
            { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } }
        ]);

        const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

        res.status(200).json({ 
            success: true, 
            totalRevenue, 
            totalEvents: completedEvents.length 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
