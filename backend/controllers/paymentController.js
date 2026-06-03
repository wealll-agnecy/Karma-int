const paymentService = require('../services/paymentService');
const razorpayService = require('../services/razorpayService');

exports.createOrder = async (req, res, next) => {
    try {
        const { amount, currency, referenceData } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }

        if (referenceData && referenceData.bookingId) {
            const Booking = require('../models/Booking');
            const booking = await Booking.findById(referenceData.bookingId);
            if (booking && booking.paymentStatus === 'completed') {
                return res.status(400).json({ success: false, message: 'Booking is already fully paid.' });
            }
        }

        const { order, payment } = await paymentService.initializePayment(userId, amount, currency, referenceData);

        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            dbPaymentId: payment._id
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification parameters' });
        }

        const result = await paymentService.verifyAndCapture(razorpay_order_id, razorpay_payment_id, razorpay_signature);

        if (result.success) {
            const payment = result.payment;
            
            // STRICT PHASE 4 & 12: Only generate tickets AFTER verification passes!
            // If alreadyProcessed is true, it means webhook beat us to it.
            let finalizedTicketId = null;
            if (payment.bookingId) {
                const Booking = require('../models/Booking');
                const booking = await Booking.findById(payment.bookingId);
                
                if (booking) {
                    if (!result.alreadyProcessed) {
                        const bookingController = require('./bookingController');
                        try {
                            const amount = payment.amount / 100; // Convert paise back to rupees
                            if (booking.paymentStatus === 'pending') {
                                // Initial Booking - Do Inventory and Ticket Generation
                                const resObj = await bookingController.finalizeBookingInternally(booking._id, amount, razorpay_payment_id, razorpay_order_id);
                                if (resObj && resObj.ticketId) finalizedTicketId = resObj.ticketId;
                            } else if (booking.paymentStatus === 'partial') {
                                // Installment Payment
                                const resObj = await bookingController.finalizeInstallmentInternally(booking._id, amount, razorpay_payment_id, razorpay_order_id);
                                if (resObj && resObj.ticketId) finalizedTicketId = resObj.ticketId;
                            }
                        } catch (finalizeErr) {
                            console.error("🚨 Booking Finalization Failed after Payment Success:", finalizeErr);
                            // We still return success for the payment, but warn about ticket generation
                            return res.status(200).json({ 
                                success: true, 
                                message: 'Payment verified, but ticket generation failed. Contact support.', 
                                payment 
                            });
                        }
                    } else {
                        // Already processed by webhook
                        finalizedTicketId = booking.ticketId || null;
                    }
                }
            }

            res.status(200).json({ success: true, message: 'Payment verified successfully', payment, ticketId: finalizedTicketId });
        } else {
            res.status(400).json({ success: false, message: 'Payment signature verification failed' });
        }
    } catch (error) {
        next(error);
    }
};

// Note: This endpoint must receive the raw body to verify signature correctly.
exports.webhook = async (req, res, next) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'];
        
        // Ensure body is raw string/buffer for webhook verification, but assuming standard express json parser here
        // A custom middleware in routes usually handles the raw body for webhooks
        const bodyStr = req.rawBody || JSON.stringify(req.body);

        if (!webhookSecret) {
            console.error('🚨 Webhook Error: RAZORPAY_WEBHOOK_SECRET is not defined in environment variables');
            return res.status(500).json({ success: false, message: 'Server configuration error' });
        }
        
        if (!signature) {
            return res.status(400).json({ success: false, message: 'Missing webhook signature' });
        }

        const isValid = razorpayService.verifyWebhookSignature(bodyStr, signature, webhookSecret);
        if (!isValid) {
            console.error('🚨 Webhook Error: Invalid signature received');
            return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }

        const { event, payload } = req.body;
        
        await paymentService.processWebhook(event, payload);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
};
