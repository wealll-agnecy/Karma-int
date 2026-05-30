const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// --- BASE USER SCHEMA ---
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        match: [/^\+?\d{7,15}$/, 'Please add a valid phone number']
    },
    role: {
        type: String,
        enum: ['attendee', 'organizer', 'admin', 'staff'],
        default: 'attendee',
        required: true
    },
    avatar: {
        type: String,
        default: 'no-avatar.jpg'
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'suspended'],
        default: 'verified'
    },
    fcmToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    discriminatorKey: 'role', // This handles the logical separation
    timestamps: true
});

// --- PRODUCTION INDEXES ---
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
// Note: email already has unique:true in schema field — no duplicate index needed
// Compound indexes for admin organizer management queries
UserSchema.index({ role: 1, status: 1 });           // getPendingOrganizers, getApprovedOrganizers
UserSchema.index({ role: 1, isRejected: 1 });        // getRejectedOrganizers
UserSchema.index({ role: 1, createdAt: -1 });        // getAllUsers sorted
UserSchema.index({ resetPasswordToken: 1 }, { sparse: true }); // forgot password lookup

// --- AUTH LOGIC ---
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return resetToken;
};

const User = mongoose.model('User', UserSchema);

// --- ROLE-SPECIFIC DISCRIMINATORS (PRO SEPARATION) ---

// 1. Organizer Schema
const Organizer = User.discriminator('organizer', new mongoose.Schema({
    isApproved: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    rejectionReason: String,
    organizationDetails: {
        companyName: String,
        registrationNumber: String,
        eventIntent: String,
        website: String,
        logo: String,
        address: String,
        selectedEventTypes: [String]
    },
    operationalAddons: [{
        type: { type: String },
        name: String
    }]
}));

// 2. Staff Schema
const Staff = User.discriminator('staff', new mongoose.Schema({
    staffRole: {
        type: String,
        enum: ['gate staff', 'coordinator', 'support'],
        required: true
    },
    assignedEvents: [{ type: mongoose.Schema.ObjectId, ref: 'Event' }],

    // Role-based scanner assignment (required for QR access control)
    staffCheckRole: {
        type: String,
        enum: ['ENTRY', 'FOOD', 'PARKING', 'CUSTOM_ADDON'],
        required: true,
        default: 'ENTRY'
    },

    // For CUSTOM_ADDON staff: can claim multiple item names
    customAddonItemNames: {
        type: [String],
        default: []
    },

    staffId: {
        type: String,
        unique: true,
        sparse: true
    },

    createdBy: { type: mongoose.Schema.ObjectId, ref: 'User' }
}));

// 3. Admin Schema
const Admin = User.discriminator('admin', new mongoose.Schema({
    permissions: [String]
}));

// 4. Attendee Schema
const Attendee = User.discriminator('attendee', new mongoose.Schema({
    interests: [String],
    address: String,
    whatsappNumber: String,
    city: String,
    state: String,
    companyName: String,
    designation: String,
    heardAboutUs: String,
    reference: String,
    selectedIndustries: [String]
}));

module.exports = User;

