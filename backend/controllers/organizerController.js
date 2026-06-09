const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Expense = require('../models/Expense');
const { notificationQueue } = require('../queue/notificationQueue');



// @desc    Get all users (admin only)
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get comprehensive event details for organizer dashboard
// @route   GET /api/v1/organizer/event/:id/details
// @access  Private (Organizer)
exports.getOrganizerEventDetails = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Verify ownership or admin
        if (event.organizer.toString() !== (req.user.id || req.user._id).toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized an event owner' });
        }

        // 1. Fetch Bookings and Expenses
        const bookings = await Booking.find({ event: eventId, paymentStatus: 'completed' });
        const expenses = await Expense.find({ eventId });

        // Calculate Totals
        const totalTickets = bookings.reduce((acc, b) => acc + (b.quantity || 0), 0);
        const totalRevenue = bookings.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
        const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        
        const profit = totalRevenue > totalExpenses ? totalRevenue - totalExpenses : 0;
        const loss = totalExpenses > totalRevenue ? totalExpenses - totalRevenue : 0;

        // 2. Date-wise Ticket Sales
        const dateSalesMap = {};
        bookings.forEach(b => {
            const bDates = b.selectedDays && b.selectedDays.length > 0 
                ? b.selectedDays.map(d => new Date(d).toLocaleDateString('en-CA')) // YYYY-MM-DD format
                : [new Date(b.selectedDate || event.date).toLocaleDateString('en-CA')];
            
            bDates.forEach(dateStr => {
                if (!dateSalesMap[dateStr]) {
                    dateSalesMap[dateStr] = { tickets: 0, revenue: 0 };
                }
                const sliceRev = b.totalAmount / bDates.length;
                const sliceTix = b.quantity / bDates.length;
                dateSalesMap[dateStr].tickets += sliceTix;
                dateSalesMap[dateStr].revenue += sliceRev;
            });
        });
        
        const dateWiseSales = Object.keys(dateSalesMap).map(date => ({
            date,
            ticketsSold: Math.ceil(dateSalesMap[date].tickets),
            revenue: dateSalesMap[date].revenue
        }));

        // 3. Plan-wise Sales
        const planSalesMap = {};
        bookings.forEach(b => {
            const plan = b.ticketType || 'General';
            if (!planSalesMap[plan]) planSalesMap[plan] = { tickets: 0, revenue: 0 };
            planSalesMap[plan].tickets += (b.quantity || 0);
            planSalesMap[plan].revenue += (b.totalAmount || 0);
        });
        
        const planWiseSales = Object.keys(planSalesMap).map(plan => ({
            planName: plan,
            ticketsSold: planSalesMap[plan].tickets,
            revenue: planSalesMap[plan].revenue
        }));

        // 4. Expenses Breakdown
        const expensesBreakdown = expenses.map(e => ({
            title: e.title || e.category,
            amount: e.amount,
            date: e.date
        }));

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    eventName: event.title,
                    totalTickets,
                    totalRevenue,
                    totalExpenses,
                    profit,
                    loss
                },
                dateWiseSales,
                planWiseSales,
                expensesBreakdown
            }
        });
    } catch (error) {
        console.error("Event details analytics error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get custom operational addons
// @route   GET /api/v1/organizer/addons
// @access  Private (Organizer)
exports.getAddons = async (req, res) => {
    try {
        const organizerId = req.user.id || req.user._id;
        const organizer = await User.findById(organizerId);
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        res.status(200).json({ success: true, data: organizer.operationalAddons || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Create a custom operational addon
// @route   POST /api/v1/organizer/addons
// @access  Private (Organizer)
exports.createAddon = async (req, res) => {
    try {
        const { type, name } = req.body;
        if (!type || !name) {
            return res.status(400).json({ success: false, message: 'Type and name are required' });
        }
        
        const organizerId = req.user.id || req.user._id;
        const organizer = await User.findById(organizerId);
        
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Prevent duplicates
        const exists = organizer.operationalAddons?.find(a => a.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            return res.status(400).json({ success: false, message: 'Addon with this name already exists' });
        }

        // Generate Addon Code
        const words = name.trim().split(/\s+/);
        let baseCode = words.length > 1 
            ? words.map(w => w[0].toUpperCase()).join('') 
            : name.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase();
        
        let addonCode = baseCode;
        let suffix = 1;
        while (organizer.operationalAddons?.find(a => a.addonCode === addonCode)) {
            addonCode = baseCode + suffix;
            suffix++;
        }

        organizer.operationalAddons = organizer.operationalAddons || [];
        organizer.operationalAddons.push({ type, name, addonCode });
        await organizer.save();

        res.status(201).json({ success: true, data: organizer.operationalAddons });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Delete a custom operational addon
// @route   DELETE /api/v1/organizer/addons/:name
// @access  Private (Organizer)
exports.deleteAddon = async (req, res) => {
    try {
        const { name } = req.params;
        const organizerId = req.user.id || req.user._id;
        const organizer = await User.findById(organizerId);
        
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        organizer.operationalAddons = organizer.operationalAddons?.filter(
            a => a.name.toLowerCase() !== name.toLowerCase()
        ) || [];
        
        await organizer.save();
        res.status(200).json({ success: true, data: organizer.operationalAddons });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
