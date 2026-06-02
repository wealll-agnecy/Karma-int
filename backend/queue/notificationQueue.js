const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendToUser, broadcast } = require('../utils/firebaseRealtime');
const { sendPushNotification } = require('../utils/firebase');

/**
 * CORE LOGIC: Unified notification processor
 * This can be called by the Worker OR directly in offline mode.
 */
const processNotificationAction = async (data) => {
    const { userId, eventId, title, message, type } = data;
    const eventIdStr = eventId?.toString();
    
    try {
        if (type === 'new_event') {
            const users = await User.find({ status: 'verified' }).select('_id fcmToken');
            const notifications = users.map(u => ({ user: u._id, title, message, type, eventId: eventIdStr }));
            await Notification.insertMany(notifications);
            
            // Broadcast a generic notification structure for real-time UI
            broadcast('notification', { 
                title, 
                message, 
                eventId: eventIdStr, 
                type,
                createdAt: new Date(),
                isRead: false
            });

            for (const u of users) {
                if (u.fcmToken) sendPushNotification(u.fcmToken, title, message, { eventId: eventIdStr });
            }
        } else {
            const notification = await Notification.create({ user: userId, title, message, type, eventId: eventIdStr });
            sendToUser(userId, 'notification', notification);
            const user = await User.findById(userId).select('fcmToken');
            if (user?.fcmToken) sendPushNotification(user.fcmToken, title, message, { eventId: eventIdStr });
        }
    } catch (err) {
        console.error(`❌ [NOTIFICATION_PROCESSOR]: Failed:`, err.message);
        throw err;
    }
};

/**
 * HIGH-FIDELITY REDIS ADAPTER
 * Detects Redis availability and falls back gracefully to real-time relay mode.
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const REDIS_ENABLED = process.env.ENABLE_REDIS !== 'false' && !!process.env.REDIS_URL;

let notificationQueue = { 
    add: async (name, data) => {
        // Default fallback behavior
        await processNotificationAction(data);
    },
    getJob: async () => null,
    on: () => {}
};

let worker = null;
let redisClient = null;

if (REDIS_ENABLED) {
    console.log('📡 [REDIS]: Attempting connection...');
    
    redisClient = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        showFriendlyErrorStack: false,
        lazyConnect: true, // Don't block startup
        retryStrategy: (times) => {
            if (times > 3) {
                // If we failed multiple times, stop spamming logs and stay in fallback mode
                return null; 
            }
            return Math.min(times * 1000, 5000);
        }
    });

    redisClient.on('connect', () => {
        console.log('✅ [REDIS]: Connection established successfully');
    });

    redisClient.on('error', (err) => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            // Log only once for connection refusal to keep console clean
            if (notificationQueue.offlineMode !== true) {
                console.warn('⚠️ [REDIS]: Service unavailable or refused connection. Operating in fallback relay mode.');
                notificationQueue.offlineMode = true;
            }
        } else {
            console.error('❌ [REDIS]: Connection error:', err.message);
        }
    });

    try {
        notificationQueue = new Queue('notificationQueue', { 
            connection: redisClient,
            defaultJobOptions: { removeOnComplete: true, removeOnFail: 1000 }
        });

        worker = new Worker('notificationQueue', async (job) => {
            console.log(`[QUEUE]: Processing job ${job.id} (${job.name})`);
            await processNotificationAction(job.data);
        }, { 
            connection: redisClient,
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 100 }
        });

        worker.on('completed', (job) => console.log(`✅ [QUEUE]: Job ${job.id} completed`));
        worker.on('failed', (job, err) => console.error(`🚨 [QUEUE]: Job ${job.id} failed: ${err.message}`));
        
        // Wrap add method to handle potential runtime Redis failures
        const originalAdd = notificationQueue.add.bind(notificationQueue);
        notificationQueue.add = async (name, data, opts) => {
            try {
                if (redisClient.status === 'ready') {
                    return await originalAdd(name, data, opts);
                }
                throw new Error('Redis not ready');
            } catch (err) {
                console.log(`[SIGNAL]: Redis unavailable, processing ${name} via relay`);
                await processNotificationAction(data);
            }
        };

    } catch (err) {
        console.error('❌ [QUEUE]: Initialization error:', err.message);
        notificationQueue.offlineMode = true;
    }
} else {
    console.log('ℹ️ [REDIS]: Offline mode active. Using real-time relay for notifications.');
    notificationQueue.offlineMode = true;
}

const scheduleReminders = async (userId, eventId, eventDate) => {
    if (!REDIS_ENABLED) return;
    const eventTime = new Date(eventDate).getTime();
    const now = Date.now();
    const reminders = [
        { time: eventTime - 24 * 60 * 60 * 1000, msg: "Your event is tomorrow!", tag: '24h' },
        { time: eventTime - 60 * 60 * 1000, msg: "Your event starts in 1 hour!", tag: '1h' },
        { time: eventTime, msg: "Your event is starting now!", tag: 'now' }
    ];

    for (const r of reminders) {
        const delay = r.time - now;
        if (delay > 0) {
            await notificationQueue.add('reminder', { userId, eventId, title: 'Event Reminder', message: r.msg, type: 'event_reminder' }, {
                delay,
                jobId: `reminder-${userId}-${eventId}-${r.tag}`,
                attempts: 3
            });
        }
    }
};

const cancelReminders = async (userId, eventId) => {
    if (!REDIS_ENABLED) return;
    const tags = ['24h', '1h', 'now'];
    for (const tag of tags) {
        const job = await notificationQueue.getJob(`reminder-${userId}-${eventId}-${tag}`);
        if (job) await job.remove();
    }
};

const closeQueue = async () => {
    try {
        if (worker) {
            await worker.close();
            console.log('📥 [SHUTDOWN] Notification Worker closed.');
        }
        if (redisClient) {
            await redisClient.quit();
            console.log('📡 [SHUTDOWN] Notification Redis client disconnected.');
        }
    } catch (err) {
        console.error('Error closing notification queue:', err.message);
    }
};

module.exports = { notificationQueue, scheduleReminders, cancelReminders, closeQueue };
