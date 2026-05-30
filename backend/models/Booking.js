const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
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
    selectedPlans: {
        type: mongoose.Schema.Types.Mixed
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    totalAmount: {
        type: Number,
        required: true
    },
    attendeeDetails: [{
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String }  // Optional — user may not have a phone number
    }],
    selectedFood: [{
        itemName: { type: String },
        type: { type: String },
        price: { type: Number },
        quantity: { type: Number }
    }],
    selectedAddons: [{
        itemName: { type: String },
        type: { type: String },
        price: { type: Number },
        quantity: { type: Number }
    }],
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'completed', 'failed'],
        default: 'pending'
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    payments: [{
        amount: Number,
        paymentId: String,
        orderId: String,
        method: String,
        date: { type: Date, default: Date.now }
    }],
    orderId: {
        type: String,
        required: true
    },
    paymentId: {
        type: String
    },
    contactEmail: {
        type: String
    },
    ticketId: {
        type: String // We'll store the UUID or ObjectId of the ticket
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // --- LEAD MANAGEMENT FIELDS ---
    leadStatus: {
        type: String,
        enum: ['new', 'contacted', 'follow_up', 'converted', 'lost', 'calling', 'interested', 'not_interested', 'not_contacted'],
        default: 'new'
    },
    followupDate: {
        type: Date
    },
    leadNotes: [{
        note: String,
        statusAtTime: String,
        date: { type: Date, default: Date.now }
    }]
});


// Optimization Indexes
// Virtual for remaining amount
BookingSchema.virtual('remainingAmount').get(function() {
    return Math.max(0, this.totalAmount - (this.amountPaid || 0));
});

// Ensure virtuals are serialized
BookingSchema.set('toJSON', { virtuals: true });
BookingSchema.set('toObject', { virtuals: true });

BookingSchema.index({ user: 1 });
BookingSchema.index({ event: 1 });
BookingSchema.index({ paymentStatus: 1 });
BookingSchema.index({ createdAt: -1 });
// Compound indexes for the hottest query patterns
BookingSchema.index({ user: 1, createdAt: -1 });          // getMyBookings
BookingSchema.index({ event: 1, paymentStatus: 1 });      // analytics + attendee lists
BookingSchema.index({ orderId: 1 }, { sparse: true });    // payment verification lookup
BookingSchema.index({ ticketId: 1 }, { sparse: true });   // resend ticket lookup

module.exports = mongoose.model('Booking', BookingSchema);
