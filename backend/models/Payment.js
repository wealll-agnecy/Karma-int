const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // Link to booking
    orderId: { type: String, required: true, unique: true }, // Razorpay order_id
    paymentId: { type: String }, // Razorpay pay_id
    transactionId: { type: String, unique: true, sparse: true }, // Internal or bank transaction ID
    razorpaySignature: { type: String }, // For cryptographic verification
    amount: { type: Number, required: true }, // Amount in paise
    currency: { type: String, default: 'INR' },
    status: { 
        type: String, 
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], 
        default: 'PENDING' 
    },
    paymentMethod: { type: String },
    paidAt: { type: Date },
    // Complete audit history for every status change or webhook event
    auditHistory: [{
        action: String, // e.g., 'INITIALIZED', 'WEBHOOK_RECEIVED', 'VERIFICATION_PASSED', 'VERIFICATION_FAILED'
        status: String, // Status at the time of the event
        payload: mongoose.Schema.Types.Mixed, // Raw data (webhook payload, error details, etc)
        timestamp: { type: Date, default: Date.now }
    }],
    notes: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

PaymentSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// --- PRODUCTION INDEXES ---
PaymentSchema.index({ bookingId: 1, status: 1 }); // Optimize analytics aggregation
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
