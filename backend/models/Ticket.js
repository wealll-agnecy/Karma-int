const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true
    },

    ticketCode: {
        type: String,
        required: [true, 'Ticket Code is mandatory'],
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    mobileNumber: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    eventName: {
        type: String,
        required: true
    },

    eventId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event',
        required: true
    },

    ticketType: {
        type: String,
        required: true
    },

    selectedDate: {
        type: Date
    },

    selectedDays: [{
        type: Date
    }],

    ticketPrice: {
        type: Number,
        required: true
    },

    quantity: {
        type: Number,
        default: 1,
        description: 'Number of persons this ticket is valid for (GROUP TICKET LOGIC)'
    },

    bookedAt: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: ['unused', 'used', 'cancelled'],
        default: 'unused'
    },

    isScanned: {
        type: Boolean,
        default: false
    },

    seatNumber: {
        type: String,
        default: 'General'
    },

    scannedAt: {
        type: Date
    },

    lastScanDate: {
        type: Date
    },

    amountPaid: {
        type: Number,
        default: 0
    },

    totalAmount: {
        type: Number
    },

    paymentStatus: {
        type: String,
        enum: ['PARTIAL', 'PAID'],
        default: 'PARTIAL'
    },

    booking: {
        type: mongoose.Schema.ObjectId,
        ref: 'Booking'
    },

    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },

    event: {
        type: mongoose.Schema.ObjectId,
        ref: 'Event'
    },

    // ENTRY SCAN
    entryScanned: {
        type: Boolean,
        default: false
    },

    entryScannedAt: {
        type: Date
    },

    // FOOD
    foodTaken: {
        type: Boolean,
        default: false
    },

    foodTakenAt: {
        type: Date
    },

    // PARKING
    parkingUsed: {
        type: Boolean,
        default: false
    },

    parkingUsedAt: {
        type: Date
    },

    // ADDONS / GOODIES / TSHIRT / BAG ETC
    addonsTaken: {
        type: Boolean,
        default: false
    },

    addonsTakenAt: {
        type: Date
    },

    // MULTIPLE ADDON TRACKING
    addonStatuses: {
        type: Map,
        of: Boolean,
        default: {}
    },

    // MULTI-DAY TRACKING
    // date (YYYY-MM-DD) -> { entry: boolean, food: boolean, parking: boolean, addons: { addonName: boolean } }
    dailyScans: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

// --- PRODUCTION INDEXES ---
TicketSchema.index({ status: 1 });
TicketSchema.index({ isScanned: 1 });
TicketSchema.index({ booking: 1 });
TicketSchema.index({ user: 1 });
TicketSchema.index({ event: 1 });
TicketSchema.index({ bookedAt: -1 });

// Hot query optimization
TicketSchema.index({ eventId: 1, status: 1 });
TicketSchema.index({ eventId: 1, isScanned: 1 });

// Scan system optimization
TicketSchema.index({ entryScanned: 1 });
TicketSchema.index({ foodTaken: 1 });
TicketSchema.index({ parkingUsed: 1 });
TicketSchema.index({ addonsTaken: 1 });

// uuid & ticketCode already unique
// --- OPTIMIZATION INDEXES ---
TicketSchema.index({ eventId: 1 });
TicketSchema.index({ email: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ eventId: 1, isScanned: 1 }); // Useful for attendance reports
TicketSchema.index({ eventId: 1, email: 1 });     // Lookup specific attendee in an event

module.exports = mongoose.model('Ticket', TicketSchema);