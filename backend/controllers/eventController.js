const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/v1/events
// @access  Public
exports.getEvents = async (req, res, next) => {
    try {
        const events = await Event.find()
            .populate('organizer', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single event
// @route   GET /api/v1/events/:id
// @access  Public
exports.getEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name email _id avatar phone address organizationDetails')
            .lean();

        if (!event) {
            return res.status(404).json({
                success: false,
                message: `No event with the id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get events for current organizer (Now returns the single global event)
// @route   GET /api/v1/events/myevents
// @access  Private (Organizer)
exports.getMyEvents = async (req, res, next) => {
    try {
        const events = await Event.find()
            .select('title date venue status isLive category ticketTypes multiDayPlan isMultiDay endDate foodSettings addonsSettings')
            .lean();

        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (err) {
        next(err);
    }
};
