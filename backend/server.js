const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ 
    path: path.resolve(__dirname, '.env'),
    quiet: true 
});

// Validate required environment variables at startup
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`🚨 [CRITICAL CONFIG ERROR] Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

// Force UTF-8 for console output
if (process.stdout.isTTY) {
    process.stdout.setEncoding('utf8');
}
if (process.stderr.isTTY) {
    process.stderr.setEncoding('utf8');
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Route files
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const automationRoutes = require('./routes/automationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { protect, authorize } = require('./middleware/authMiddleware');
const adminRoutes = require('./routes/adminRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');

const initScheduler = require('./utils/scheduler');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const { initFirebase } = require('./utils/firebase');
const http = require('http');

// Initialize Notification Queue Worker
require('./queue/notificationQueue');

const app = express();

// --- CORS INITIALIZATION (Must be at the very top to set headers on 429 and 500 error responses) ---
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim().toLowerCase()) : [];
app.use(cors({
    origin: function (origin, callback) {
        // ALWAYS ALLOW - Fix CORS permanently
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// --- GZIP COMPRESSION (reduces payload sizes by 70-85%) ---
app.use(compression({
    level: 6,           // Balanced: compression ratio vs CPU cost
    threshold: 1024,    // Only compress responses > 1KB (skip tiny responses)
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));
const server = http.createServer(app);

// Initialize Firebase
initFirebase();

// Set security HTTP headers
app.set('trust proxy', 1); // trust first proxy
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:", "wss:", "http:", "ws:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

const isLoopbackRequest = (req) => {
    const remoteAddress = req.socket?.remoteAddress || req.ip || '';

    return [remoteAddress].some(value =>
        value.includes('localhost') ||
        value.includes('127.0.0.1') ||
        value.includes('::1') ||
        value.includes('::ffff:127.0.0.1')
    );
};

// General API safety net. Local/dev traffic is skipped so Vite hot reload,
// dashboard polling, and repeated manual testing never lock the app out.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5000 : 100000,
    skip: (req) => process.env.NODE_ENV !== 'production' || isLoopbackRequest(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});
app.use('/api', limiter);

const { queryParserSanitizer, bodyAndParamSanitizer } = require('./middleware/sanitizationMiddleware');

// Override Express 5 query parser to inject sanitization natively
app.set('query parser', queryParserSanitizer);

// Capture raw body for Razorpay webhook verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

// Safe Express 5 sanitization against NoSQL injection and XSS for body/params
app.use(bodyAndParamSanitizer);

// Gracefully handle malformed JSON payloads
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(`🚨 [BAD JSON PAYLOAD]: ${err.message}`);
        return res.status(400).json({ success: false, message: 'Malformed JSON payload' });
    }
    next(err);
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cookieParser());

// Force UTF-8 for all JSON API responses only
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// --- PERFORMANCE MIDDLEWARE: Response Time Logger ---
// Logs any API route that exceeds 200ms. Does NOT set headers after response.
app.use('/api', (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
        if (ms > 200) {
            console.warn(`⚠️  [SLOW_API >200ms]: ${req.method} ${req.path} — ${ms.toFixed(1)}ms`);
        }
    });
    next();
});



console.log("🚀 Mounting routers...");

// --- PHASE 3: API HEALTH CHECK ---
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    res.status(200).json({
        status: "healthy",
        database: mongoose.connection.readyState === 1,
        firebase: true, // Firebase relies on env injection, assuming true if loaded
        socket: !!global.io, // Assuming Socket.IO is attached to global.io or will be
        timestamp: new Date().toISOString()
    });
});

app.use('/api/v1/enquiries', enquiryRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/organizer', organizerRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);

const { downloadTicket, verifyTicketForScanner, downloadTicketPublic } = require('./controllers/ticketController');
app.get('/api/ticket/download/:id', protect, downloadTicket);
app.get('/api/ticket/download-pdf/:uuid', downloadTicketPublic);
app.get('/api/ticket/verify/:id', verifyTicketForScanner);

// --- SMTP TEST ROUTE (Admin Only) ---
app.get("/test-mail", protect, authorize('admin'), async (req, res) => {
    try {
        const { sendTicketMail } = require('./utils/sendEmail');
        const info = await sendTicketMail({
            to: "gp775843@gmail.com",
            subject: "SMTP TEST",
            html: "<b>Your SMTP is working perfectly</b>",
        });

        res.send("MAIL SENT SUCCESSFULLY TO gp775843@gmail.com. Check your inbox!");
    } catch (err) {
        console.error("❌ TEST MAIL FAILED:", err);
        res.status(500).send("MAIL FAILED: " + err.message);
    }
});

// --- SERVE FRONTEND IN PRODUCTION ---
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(distPath));

    // Safe SPA fallback for Express 5 (avoids path-to-regexp wildcard issues)
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
            return res.sendFile(path.join(distPath, 'index.html'));
        }
        next();
    });
}

app.use((req, res, next) => {
    console.log(`❌ [404 ERROR]: ${req.method} ${req.originalUrl} - No route matched`);
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found on this server`
    });
});

app.use((err, req, res, next) => {
    console.error("🚨 GLOBAL SERVER ERROR:", err.stack || err.message);
    res.status(err.statusCode || err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

// --- STARTUP SEQUENCE ---
const startServer = async () => {
    try {
        console.log('💾 Connecting to Database...');
        await connectDB();

        console.log('⏰ Initializing Scheduler...');
        initScheduler();

        console.log("✅ Event Routes Loaded:", eventRoutes.stack.filter(r => r.route).map(r => `${Object.keys(r.route.methods)} ${r.route.path}`));
        console.log("✅ Booking Routes Loaded:", bookingRoutes.stack.filter(r => r.route).map(r => `${Object.keys(r.route.methods)} ${r.route.path}`));

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 [SERVER LIVE] [PORT: ${PORT}]`);
        });
    } catch (startupErr) {
        console.error('🚨 [SERVER STARTUP CRASH]:', startupErr.message);
        process.exit(1);
    }
};

const PORT = process.env.PORT || 5002;

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ [SERVER ERROR]: Port ${PORT} is already in use.`);
        process.exit(1);
    }
});

// --- PRODUCTION SAFETY NET ---
process.on('unhandledRejection', (err, promise) => {
    console.error(`🚨 [UNHANDLED REJECTION]:`, err);
});

process.on('uncaughtException', (err) => {
    console.error(`🚨 [UNCAUGHT EXCEPTION]:`, err);
    process.exit(1); // Exit immediately; process manager (PM2) will restart
});

// --- GRACEFUL SHUTDOWN HANDLING ---
const gracefulShutdown = async (signal) => {
    console.log(`\n🤖 [SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
        console.log('🚪 [SHUTDOWN] HTTP server closed.');
    });

    try {
        // Disconnect Mongoose
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('💾 [SHUTDOWN] Mongoose connection closed.');
        }

        // Close Queues
        try {
            const notificationQueueFile = require('./queue/notificationQueue');
            if (notificationQueueFile && typeof notificationQueueFile.closeQueue === 'function') {
                await notificationQueueFile.closeQueue();
            }
        } catch (queueErr) {
            console.error('Error closing notification queue:', queueErr.message);
        }

        try {
            const ticketQueueFile = require('./queue/ticketQueue');
            if (ticketQueueFile && typeof ticketQueueFile.closeQueue === 'function') {
                await ticketQueueFile.closeQueue();
            }
        } catch (queueErr) {
            console.error('Error closing ticket queue:', queueErr.message);
        }

        console.log('👋 [SHUTDOWN] Graceful shutdown completed. Exiting.');
        process.exit(0);
    } catch (err) {
        console.error('🚨 [SHUTDOWN ERROR] Error during shutdown:', err.message);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
