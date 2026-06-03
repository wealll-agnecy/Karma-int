const Payment = require('../models/Payment');
const razorpayService = require('./razorpayService');

class PaymentService {
    async initializePayment(userId, amount, currency = 'INR', referenceData = {}) {
        const receiptId = `rcpt_${Date.now()}`;
        const order = await razorpayService.createOrder(amount, currency, receiptId, referenceData);

        const payment = await Payment.create({
            userId: userId,
            bookingId: referenceData.bookingId || null,
            orderId: order.id,
            amount: order.amount, // already in paise
            currency: order.currency,
            status: 'PENDING',
            auditHistory: [{
                action: 'INITIALIZED',
                status: 'PENDING',
                payload: { orderId: order.id, amount, currency }
            }],
            notes: referenceData
        });

        return { order, payment };
    }

    async verifyAndCapture(orderId, paymentId, signature) {
        const isValid = razorpayService.verifySignature(orderId, paymentId, signature);
        
        if (isValid) {
            const payment = await Payment.findOneAndUpdate(
                { orderId: orderId, status: { $ne: 'SUCCESS' } },
                {
                    $set: {
                        paymentId: paymentId,
                        razorpaySignature: signature,
                        status: 'SUCCESS',
                        paidAt: new Date()
                    },
                    $push: {
                        auditHistory: {
                            action: 'VERIFICATION_PASSED',
                            status: 'SUCCESS',
                            payload: { paymentId, signature }
                        }
                    }
                },
                { new: true }
            );

            if (!payment) {
                const existing = await Payment.findOne({ orderId: orderId });
                if (!existing) throw new Error('Payment record not found for order id');
                if (existing.status === 'SUCCESS') {
                    return { success: true, payment: existing, alreadyProcessed: true };
                }
                throw new Error('Payment update failed');
            }
            return { success: true, payment, alreadyProcessed: false };
        } else {
            const payment = await Payment.findOne({ orderId: orderId });
            if (payment && payment.status !== 'SUCCESS') {
                payment.status = 'FAILED';
                payment.auditHistory.push({
                    action: 'VERIFICATION_FAILED',
                    status: 'FAILED',
                    payload: { paymentId, signature }
                });
                await payment.save();
            }
            return { success: false, payment };
        }
    }

    async processWebhook(event, payload) {
        const orderId = payload.payment?.entity?.order_id;
        if (!orderId) return;

        if (event === 'payment.captured') {
            const payment = await Payment.findOneAndUpdate(
                { orderId: orderId, status: { $ne: 'SUCCESS' } },
                {
                    $set: {
                        status: 'SUCCESS',
                        paymentId: payload.payment.entity.id,
                        paymentMethod: payload.payment.entity.method,
                        paidAt: new Date()
                    },
                    $push: {
                        auditHistory: {
                            action: 'WEBHOOK_RECEIVED',
                            status: 'SUCCESS',
                            payload: { event, payload }
                        }
                    }
                },
                { new: true }
            );

            if (!payment) {
                // If it wasn't updated, either it doesn't exist, or it is already SUCCESS
                const existing = await Payment.findOne({ orderId: orderId });
                if (existing) {
                    existing.auditHistory.push({
                        action: 'WEBHOOK_IGNORED_DUPLICATE',
                        status: existing.status,
                        payload: { event, payload }
                    });
                    await existing.save();
                }
                return existing;
            }

            // FALLBACK TICKET GENERATION: If webhook beats frontend verify, generate tickets here
            if (payment.bookingId) {
                const Booking = require('../models/Booking');
                const bookingController = require('../controllers/bookingController');
                const booking = await Booking.findById(payment.bookingId);
                
                // Only process if it hasn't been finalized yet
                if (booking && (booking.paymentStatus === 'pending' || booking.paymentStatus === 'partial')) {
                    try {
                        const amount = payment.amount / 100;
                        if (booking.paymentStatus === 'pending') {
                            await bookingController.finalizeBookingInternally(booking._id, amount, payment.paymentId, orderId);
                        } else if (booking.paymentStatus === 'partial') {
                            await bookingController.finalizeInstallmentInternally(booking._id, amount, payment.paymentId, orderId);
                        }
                    } catch (err) {
                        console.error("🚨 Webhook Booking Finalization Failed:", err);
                    }
                }
            }
            return payment;

        } else if (event === 'payment.authorized' || event === 'payment.failed') {
            const status = event === 'payment.authorized' ? 'PENDING' : 'FAILED';
            const payment = await Payment.findOneAndUpdate(
                { orderId: orderId, status: { $ne: 'SUCCESS' } },
                {
                    $set: {
                        status: status,
                        paymentId: payload.payment?.entity?.id
                    },
                    $push: {
                        auditHistory: {
                            action: 'WEBHOOK_RECEIVED',
                            status: status,
                            payload: { event, payload }
                        }
                    }
                },
                { new: true }
            );
            return payment;
        }
    }
}

module.exports = new PaymentService();
