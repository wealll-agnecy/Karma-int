const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ 
    path: path.resolve(__dirname, '.env'),
    quiet: true 
});

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

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const automationRoutes = require('./routes/automationRoutes');
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
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) : [];
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow exact growthutsav.in and its official subdomains, netlify.app, onrender.com plus local development
        if (origin === 'https://growthutsav.in' || origin === 'https://www.growthutsav.in' || origin.endsWith('.growthutsav.in') || origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.error(`🚨 [CORS REJECTED]: ${origin}`);
            return callback(new Error('Not allowed by CORS'));
        }
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
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
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

app.use(express.json());
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
app.use('/api/v1/enquiries', enquiryRoutes);
app.use('/api/v1/bookings', bookingRoutes);
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
    console.error("🚨 GLOBAL SERVER ERROR:", err.message);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server Error'
    });
});

initScheduler();

console.log("✅ Event Routes Loaded:", eventRoutes.stack.filter(r => r.route).map(r => `${Object.keys(r.route.methods)} ${r.route.path}`));
console.log("✅ Booking Routes Loaded:", bookingRoutes.stack.filter(r => r.route).map(r => `${Object.keys(r.route.methods)} ${r.route.path}`));

const PORT = process.env.PORT || 5002;

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ [SERVER ERROR]: Port ${PORT} is already in use.`);
        process.exit(1);
    }
});

// --- PRODUCTION SAFETY NET ---
process.on('unhandledRejection', (err, promise) => {
    console.error(`🚨 [UNHANDLED REJECTION]: ${err.message}`);
});

process.on('uncaughtException', (err) => {
    console.error(`🚨 [UNCAUGHT EXCEPTION]: ${err.message}`);
    process.exit(1); // Exit immediately; process manager (PM2) will restart
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SERVER LIVE] [PORT: ${PORT}]`);
});
