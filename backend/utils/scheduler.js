const cron = require('node-cron');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const { createInternalNotification } = require('../controllers/notificationController');
const { sendTicketMail: sendEmail } = require('./sendEmail');
const sendWhatsApp = require('./sendWhatsApp');

const initScheduler = () => {
    // â”€â”€ Daily Countdown Reminders (10:00 AM) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cron.schedule('0 10 * * *', async () => {
        console.log('Running daily countdown reminder job...');
        
        try {
            // Find all upcoming approved events
            const now = new Date();
            const futureEvents = await Event.find({
                date: { $gt: now },
                status: 'approved'
            });

            for (const event of futureEvents) {
                const bookings = await Booking.find({ 
                    event: event._id, 
                    paymentStatus: 'completed' 
                }).populate('user');

                const daysLeft = Math.ceil((new Date(event.date) - now) / (1000 * 60 * 60 * 24));

                for (const booking of bookings) {
                    try {
                        const user = booking.user;
                        if (!user) continue;

                        const message = daysLeft === 1 
                            ? `Reminder: "${event.title}" is happening TOMORROW! Venue: ${event.venue}.`
                            : `Ongoing Countdown: "${event.title}" starts in ${daysLeft} days. We're getting ready!`;

                        // 1. In-app notification
                        await createInternalNotification(user._id, message, 'event_reminder', event._id);

                        // 2. Email (only if 1 day left)
                        if (daysLeft === 1) {
                            await sendEmail({
                                email: user.email,
                                subject: `Final Daily Reminder: ${event.title} is Tomorrow!`,
                                message: `<p>${message}</p><p>Time: ${event.time}</p>`
                            }).catch(err => console.error(`[SCHEDULER] Failed to send email to ${user.email}:`, err.message));
                        }
                    } catch (bookingErr) {
                        console.error(`[SCHEDULER] Error processing daily reminder for booking ${booking._id}:`, bookingErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('Scheduler Error (Daily):', err.message);
        }
    });

    // ─── Final 2-Hour Reminder (Every 30 mins) ──────────────────────────
    cron.schedule('*/30 * * * *', async () => {
        console.log('Running final 2-hour alert job...');
        
        try {
            const now = new Date();
            const twoHoursLater = new Date(now.getTime() + 120 * 60000);
            const twoHoursHalfLater = new Date(now.getTime() + 150 * 60000);

            // Find events starting in approx 2 hours
            const urgentEvents = await Event.find({
                date: { $gte: twoHoursLater, $lte: twoHoursHalfLater },
                status: 'approved'
            });

            for (const event of urgentEvents) {
                const bookings = await Booking.find({ 
                    event: event._id, 
                    paymentStatus: 'completed' 
                }).populate('user');

                for (const booking of bookings) {
                    try {
                        const user = booking.user;
                        if (!user) continue;

                        const message = `FINAL ALERT: "${event.title}" starts in 2 hours! Get your QR code ready.`;
                        
                        // In-app
                        await createInternalNotification(user._id, message, 'event_reminder', event._id);
                        
                        // Priority Email
                        await sendEmail({
                            email: user.email,
                            subject: `IMMEDIATE: ${event.title} begins in 2 Hours!`,
                            message: `<p>${message}</p><p>Venue: ${event.venue}</p>`
                        }).catch(err => console.error(`[SCHEDULER] Failed to send urgent email to ${user.email}:`, err.message));

                        // WhatsApp (Critical)
                        if (user.phone) {
                            await sendWhatsApp({
                                phone: user.phone,
                                message: `FINAL ALERT: ${event.title} starts in 2 hours! Don't be late. Venue: ${event.venue}`
                            }).catch(err => console.error(`[SCHEDULER] Failed to send WhatsApp to ${user.phone}:`, err.message));
                        }
                    } catch (bookingErr) {
                        console.error(`[SCHEDULER] Error processing urgent reminder for booking ${booking._id}:`, bookingErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('Scheduler Error (Urgent):', err.message);
        }
    });
};

module.exports = initScheduler;

