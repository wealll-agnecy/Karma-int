const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const processTicketAction = async (data) => {
    const { ticketId } = data;
    try {
        console.log(`[TICKET QUEUE]: Processing ticket ${ticketId}`);
        const Ticket = require('../models/Ticket');
        const { generateTicketPDF } = require('../services/pdfService');
        const { sendBookingConfirmation } = require('../services/emailService');
        const sendWhatsApp = require('../utils/sendWhatsApp');
        
        const ticket = await Ticket.findById(ticketId).populate('event').populate('booking');
        if (!ticket) {
            console.error(`[TICKET QUEUE]: Ticket not found for ID ${ticketId}`);
            return;
        }

        console.log(`[TICKET QUEUE]: Generating PDF for ${ticket.name} (${ticket.ticketCode})`);
        const pdfBuffer = await generateTicketPDF(ticket._id);
        
        // 1. Send Email
        try {
            console.log(`[TICKET QUEUE]: Sending email to ${ticket.email}`);
            await sendBookingConfirmation(
                { name: ticket.name, email: ticket.email },
                ticket.event,
                pdfBuffer,
                { 
                    ticketType: ticket.ticketType, 
                    quantity: 1, 
                    totalAmount: ticket.ticketPrice, 
                    ticketId: ticket._id 
                }
            );
        } catch (emailErr) {
            console.error(`[TICKET QUEUE]: Email dispatch failed for ticket ${ticketId}:`, emailErr.message);
        }

        // 2. Send WhatsApp
        if (ticket.mobileNumber && ticket.mobileNumber !== '0000000000') {
            try {
                console.log(`[TICKET QUEUE]: Sending WhatsApp to ${ticket.mobileNumber}`);
                const publicUrl = process.env.PUBLIC_URL || (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0].trim() : 'http://localhost:5173');
                const downloadUrl = `${publicUrl}/api/ticket/download-pdf/${ticket.uuid}`;
                
                const eventDateFormatted = new Date(ticket.event.date).toLocaleDateString(undefined, { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                });
                
                const whatsappMessage = `Hello *${ticket.name}*,\n\n` +
                    `Your ticket for *${ticket.event.title}* has been confirmed! 🎉\n\n` +
                    `*Ticket Details:*\n` +
                    `• *Ticket ID:* ${ticket.ticketCode}\n` +
                    `• *Pass Type:* ${ticket.ticketType}\n` +
                    `• *Venue:* ${ticket.event.venue}\n` +
                    `• *Date:* ${eventDateFormatted}\n` +
                    `• *Time:* ${ticket.event.time || '10:00 AM'}\n\n` +
                    `Click below to view & download your secure digital pass PDF:\n` +
                    `${downloadUrl}\n\n` +
                    `See you at the event!`;

                await sendWhatsApp({
                    phone: ticket.mobileNumber,
                    message: whatsappMessage,
                    mediaUrl: downloadUrl
                });
            } catch (waErr) {
                console.error(`[TICKET QUEUE]: WhatsApp dispatch failed for ticket ${ticketId}:`, waErr.message);
            }
        }
    } catch (err) {
        console.error(`❌ [TICKET QUEUE ERROR]: Failed processing ticket ${ticketId}:`, err.message);
        throw err;
    }
};

const processPartialPaymentAction = async (data) => {
    const { ticketId } = data;
    try {
        console.log(`[TICKET QUEUE]: Processing partial payment for ticket ${ticketId}`);
        const Ticket = require('../models/Ticket');
        const { sendPartialPaymentConfirmation } = require('../services/emailService');
        const qrcode = require('qrcode');
        
        const ticket = await Ticket.findById(ticketId).populate('event').populate('booking');
        if (!ticket) {
            console.error(`[TICKET QUEUE]: Ticket not found for ID ${ticketId}`);
            return;
        }

        console.log(`[TICKET QUEUE]: Generating QR Pass for partial payment: ${ticket.name}`);
        const qrDataUrl = await qrcode.toDataURL(ticket.uuid, { width: 300, margin: 1 });
        
        try {
            await sendPartialPaymentConfirmation(
                { name: ticket.name, email: ticket.email },
                ticket.event,
                qrDataUrl,
                { 
                    ticketType: ticket.ticketType, 
                    quantity: ticket.quantity || 1, 
                    totalAmount: ticket.totalAmount || ticket.ticketPrice, 
                    paidAmount: ticket.amountPaid || 0,
                    dueAmount: Math.max(0, (ticket.totalAmount || ticket.ticketPrice) - (ticket.amountPaid || 0)),
                    bookingId: ticket.booking._id,
                    ticketId: ticket._id 
                }
            );
        } catch (emailErr) {
            console.error(`[TICKET QUEUE]: Partial email dispatch failed for ticket ${ticketId}:`, emailErr.message);
        }
    } catch (err) {
        console.error(`❌ [TICKET QUEUE ERROR]: Failed processing partial ticket ${ticketId}:`, err.message);
        throw err;
    }
};

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_ENABLED = process.env.ENABLE_REDIS !== 'false' && !!process.env.REDIS_URL;

let ticketQueue = { 
    add: async (name, data) => {
        if (name === 'sendPartialPaymentEmail') await processPartialPaymentAction(data);
        else await processTicketAction(data);
    },
    offlineMode: true
};

let worker = null;
let redisClient = null;

if (REDIS_ENABLED) {
    console.log('📡 [REDIS - TICKET QUEUE]: Attempting connection...');
    
    redisClient = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        showFriendlyErrorStack: false,
        lazyConnect: true,
        retryStrategy: (times) => {
            if (times > 3) return null; 
            return Math.min(times * 1000, 5000);
        }
    });

    redisClient.on('connect', () => {
        console.log('✅ [REDIS - TICKET QUEUE]: Connection established successfully');
    });

    redisClient.on('error', (err) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            if (ticketQueue.offlineMode !== true) {
                console.warn('⚠️ [REDIS - TICKET QUEUE]: Service unavailable. Operating in fallback relay mode.');
                ticketQueue.offlineMode = true;
            }
        } else {
            console.error('❌ [REDIS - TICKET QUEUE]: Connection error:', err.message);
        }
    });

    try {
        ticketQueue = new Queue('ticketQueue', { 
            connection: redisClient,
            defaultJobOptions: { removeOnComplete: true, removeOnFail: 1000 }
        });

        worker = new Worker('ticketQueue', async (job) => {
            console.log(`[TICKET QUEUE]: Processing job ${job.id} (${job.name})`);
            if (job.name === 'sendPartialPaymentEmail') {
                await processPartialPaymentAction(job.data);
            } else {
                await processTicketAction(job.data);
            }
        }, { 
            connection: redisClient,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 }
        });

        worker.on('completed', (job) => console.log(`✅ [TICKET QUEUE]: Job ${job.id} completed`));
        worker.on('failed', (job, err) => console.error(`🚨 [TICKET QUEUE]: Job ${job.id} failed: ${err.message}`));
        
        const originalAdd = ticketQueue.add.bind(ticketQueue);
        ticketQueue.add = async (name, data, opts) => {
            try {
                if (redisClient.status === 'ready') {
                    return await originalAdd(name, data, opts);
                }
                throw new Error('Redis not ready');
            } catch (err) {
                console.log(`[SIGNAL - TICKET QUEUE]: Redis unavailable, processing ${name} via relay`);
                if (name === 'sendPartialPaymentEmail') await processPartialPaymentAction(data);
                else await processTicketAction(data);
            }
        };

    } catch (err) {
        console.error('❌ [TICKET QUEUE]: Initialization error:', err.message);
        ticketQueue.offlineMode = true;
    }
} else {
    console.log('ℹ️ [REDIS - TICKET QUEUE]: Offline mode active. Using real-time relay for tickets.');
    ticketQueue.offlineMode = true;
}

const closeQueue = async () => {
    try {
        if (worker) {
            await worker.close();
            console.log('📥 [SHUTDOWN] Ticket Worker closed.');
        }
        if (redisClient) {
            await redisClient.quit();
            console.log('📡 [SHUTDOWN] Ticket Redis client disconnected.');
        }
    } catch (err) {
        console.error('Error closing ticket queue:', err.message);
    }
};

module.exports = { ticketQueue, closeQueue };
