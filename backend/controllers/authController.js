const User = require('../models/User');
const crypto = require('crypto');
const { sendTicketMail } = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    const responseUser = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone,
        avatar: user.avatar,
        // Attendee specific fields
        interests: user.interests,
        address: user.address,
        whatsappNumber: user.whatsappNumber,
        city: user.city,
        state: user.state,
        companyName: user.companyName,
        designation: user.designation,
        heardAboutUs: user.heardAboutUs,
        reference: user.reference,
        selectedIndustries: user.selectedIndustries
    };

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            message,
            token,
            user: responseUser
        });
};

// @desc    Register user
exports.register = async (req, res, next) => {
    let { 
        name, email, phone, password, role, organizationDetails,
        whatsappNumber, address, city, state, companyName, designation,
        heardAboutUs, reference, selectedIndustries 
    } = req.body;

    if (role === 'attendee' && whatsappNumber) {
        phone = whatsappNumber;
    }

    if (!phone || (typeof phone === 'string' && !phone.trim())) {
        phone = undefined;
    }

    try {
        // SECURITY: Never allow public registration as an admin, organizer, or attendee
        if (role === 'admin' || role === 'organizer' || role === 'attendee') {
            return res.status(403).json({ success: false, message: 'Unauthorized role assignment. Registration is disabled.' });
        }

        const checkFields = [{ email }];
        if (phone) checkFields.push({ phone });

        const conflict = await User.findOne({ $or: checkFields });

        if (conflict) {
            const field = conflict.email === email ? 'Email' : 'Phone Number';
            return res.status(400).json({
                success: false,
                message: `This ${field} is already associated with an existing account.`
            });
        }

        if (typeof organizationDetails === 'string') {
            try { organizationDetails = JSON.parse(organizationDetails); } catch (e) {}
        }

        // Ensure registrationNumber is captured even if passed separately via FormData
        if (req.body.registrationNumber && organizationDetails) {
            organizationDetails.registrationNumber = req.body.registrationNumber;
        }

        if (req.file && role === 'organizer') {
            if (!organizationDetails) organizationDetails = {};
            organizationDetails.logo = `/uploads/logos/${req.file.filename}`;
        }

        const user = await User.create({
            name, email, phone, password, role, organizationDetails,
            isApproved: true,
            status: 'verified',
            // Attendee specific fields
            whatsappNumber: role === 'attendee' ? whatsappNumber : undefined,
            address: role === 'attendee' ? address : undefined,
            city: role === 'attendee' ? city : undefined,
            state: role === 'attendee' ? state : undefined,
            companyName: role === 'attendee' ? companyName : undefined,
            designation: role === 'attendee' ? designation : undefined,
            heardAboutUs: role === 'attendee' ? heardAboutUs : undefined,
            reference: role === 'attendee' ? reference : undefined,
            selectedIndustries: role === 'attendee' ? selectedIndustries : undefined
        });

        sendTokenResponse(user, 201, res, "Registered successfully");
    } catch (err) {
        next(err);
    }
};

// @desc    Login user
exports.login = async (req, res, next) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Please provide an email/phone and password' });
    }

    try {
        const user = await User.findOne({ 
            $or: [{ email: identifier }, { phone: identifier }] 
        }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Account not found' });
        }

        if (user.role === 'attendee') {
            return res.status(403).json({ success: false, message: 'Access Denied: Attendee login is disabled.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            console.warn(`[AUTH] Failed login attempt (Incorrect password) for: ${identifier}`);
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        console.log(`[AUTH] Successful login for user: ${user.email} (Role: ${user.role})`);
        sendTokenResponse(user, 200, res, 'Login successful');
    } catch (err) {
        console.error('[AUTH_ERROR] Exception during login:', err.message);
        return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
};

// @desc    Admin Stealth Login
exports.adminLogin = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    try {
        const user = await User.findOne({ email, role: 'admin' }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Account not found' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            console.warn(`[AUTH] Failed admin login attempt (Incorrect password) for: ${email}`);
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }

        console.log(`[AUTH] Successful admin login for: ${user.email}`);
        sendTokenResponse(user, 200, res);
    } catch (err) {
        console.error('[AUTH_ERROR] Exception during admin login:', err.message);
        return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
};

// @desc    Log user out
exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, data: {} });
};

// @desc    Get current logged in user
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpire -__v').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// @desc    Update FCM Token
// @route   PATCH /api/v1/auth/fcm-token
// @access  Private
exports.updateFcmToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ success: false, message: 'FCM Token is required' });

        await User.findByIdAndUpdate(req.user.id, { fcmToken });

        res.status(200).json({ success: true, message: 'FCM Token updated successfully' });
    } catch (err) {
        next(err);
    }
};

// @desc    Create Firebase custom token for Firestore realtime listeners
// @route   GET /api/v1/auth/firebase-token
// @access  Private
exports.getFirebaseCustomToken = async (req, res, next) => {
    try {
        const { initFirebase } = require('../utils/firebase');
        const firebaseAdmin = initFirebase();

        if (!firebaseAdmin || !firebaseAdmin.apps.length) {
            return res.status(503).json({
                success: false,
                message: 'Firebase realtime is not configured'
            });
        }

        const token = await firebaseAdmin.auth().createCustomToken(req.user.id, {
            role: req.user.role || 'attendee'
        });

        res.status(200).json({ success: true, token });
    } catch (err) {
        next(err);
    }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
    try {
        const { name, email, phone, address } = req.body;

        // Check if email already exists for another user
        if (email) {
            const existingEmail = await User.findOne({ email, _id: { $ne: req.user.id } });
            if (existingEmail) {
                return res.status(400).json({ success: false, message: 'This email is already linked to another account.' });
            }
        }

        // Check if phone already exists for another user
        if (phone) {
            const existingPhone = await User.findOne({ phone, _id: { $ne: req.user.id } });
            if (existingPhone) {
                return res.status(400).json({ success: false, message: 'This phone number is already linked to another account.' });
            }
        }

        // Only include defined fields to avoid accidentally unsetting existing values
        const fieldsToUpdate = {};
        if (name !== undefined) fieldsToUpdate.name = name;
        if (email !== undefined) fieldsToUpdate.email = email;
        if (phone !== undefined) fieldsToUpdate.phone = phone;
        if (address !== undefined) fieldsToUpdate.address = address;

        if (req.file) {
            fieldsToUpdate.avatar = `/uploads/avatars/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Identity updated successfully',
            data: user
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Forgot password
exports.forgotPassword = async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) { return res.status(404).json({ success: false, message: 'User not found' }); }
    
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${siteUrl}/reset-password/${resetToken}`;
    const message = `<h1>Reset Password</h1><p>Reset link: <a href="${resetUrl}">${resetUrl}</a></p>`;

    try {
        await sendTicketMail({ to: user.email, subject: 'Password Reset', html: message });
        res.status(200).json({ success: true, data: 'Email sent' });
    } catch (err) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ success: false, message: 'Email failed' });
    }
};

// @desc    Reset password
exports.resetPassword = async (req, res, next) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) { return res.status(400).json({ success: false, message: 'Invalid token' }); }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendTokenResponse(user, 200, res);
};
