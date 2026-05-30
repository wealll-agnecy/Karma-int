const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        // Set token from cookie
        token = req.cookies.token;
    } else if (req.query && req.query.token) {
        // Set token from query string for transports that cannot send custom headers
        token = req.query.token;
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access Denied: Secure token missing'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ALWAYS fetch real User from MongoDB using precise projection to keep auth super fast and secure
        req.user = await User.findById(decoded.id)
            .select(
                '_id role status name email assignedEvents staffRole staffCheckRole customAddonItemNames createdBy'
            )
            .lean();

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Identity Breach: User node no longer exists'
            });
        }

        // Normalize: .lean() strips Mongoose virtuals, so manually set .id
        req.user.id = req.user._id.toString();

        next();
    } catch (err) {
        console.error('Auth Protocol Breach:', err.message);
        return res.status(401).json({
            success: false,
            message: 'Access Denied: Identifier invalid'
        });
    }
};

// Optional Protect (Sets req.user if token exists, but doesn't block)
exports.optionalProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id)
            .select(
                '_id role status name email assignedEvents staffRole staffCheckRole customAddonItemNames createdBy'
            )
            .lean();

        // Normalize .id for virtual parity with non-lean queries
        if (req.user) req.user.id = req.user._id.toString();
        next();
    } catch (err) {
        next();
    }
};

// ROLE-BASED ACCESS CONTROL (ENFORCED)
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Privilege Error: Role [${req.user?.role || 'null'}] is unauthorized for this sector.`
            });
        }
        next();
    };
};



