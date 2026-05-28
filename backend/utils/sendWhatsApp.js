const twilio = require('twilio');

const sendWhatsApp = async (options) => {
    try {
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID || 'AC_placeholder',
            process.env.TWILIO_AUTH_TOKEN || 'Token_placeholder'
        );

        const messageOptions = {
            body: options.message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || '+14155238886'}`,
            to: `whatsapp:${options.phone}`
        };

        if (options.mediaUrl) {
            messageOptions.mediaUrl = [options.mediaUrl];
        }

        const message = await client.messages.create(messageOptions);

        console.log('WhatsApp sent: %s', message.sid);
        return message;
    } catch (err) {
        console.error('Twilio Error:', err.message);
        // We link but don't fail the whole process if WhatsApp fails
    }
};

module.exports = sendWhatsApp;
