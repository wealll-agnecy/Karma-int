const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
    constructor() {
        this.key_id = process.env.RAZORPAY_KEY_ID || 'dummy_key_id';
        this.key_secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret';
        this.instance = new Razorpay({
            key_id: this.key_id,
            key_secret: this.key_secret,
        });
    }

    async createOrder(amount, currency = 'INR', receipt = '', notes = {}) {
        try {
            const options = {
                amount: Math.round(amount * 100), // amount in smallest currency unit
                currency,
                receipt,
                notes
            };
            const order = await this.instance.orders.create(options);
            return order;
        } catch (error) {
            console.error('Razorpay createOrder error:', error);
            throw new Error('Failed to create Razorpay order');
        }
    }

    verifySignature(orderId, paymentId, signature) {
        const generatedSignature = crypto
            .createHmac('sha256', this.key_secret)
            .update(orderId + "|" + paymentId)
            .digest('hex');
        
        return generatedSignature === signature;
    }

    verifyWebhookSignature(body, signature, webhookSecret) {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');
        
        return expectedSignature === signature;
    }
}

module.exports = new RazorpayService();
