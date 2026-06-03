const express = require('express');
const {
    checkout,
    verifyPayment,
    getMyBookings,
    demoBooking,
    resendTicketEmail
} = require('../controllers/bookingController');

const router = express.Router();
const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');

// ✅ ROUTES
router.post('/resend-ticket/:id', protect, authorize('attendee', 'admin', 'organizer', 'staff'), resendTicketEmail);
router.post('/demo-book', optionalProtect, demoBooking);
router.post('/demobook', optionalProtect, demoBooking);
router.post('/demo-checkout', optionalProtect, demoBooking);
router.post('/checkout', optionalProtect, checkout);
router.post('/create-order', optionalProtect, checkout);
router.post('/verify', verifyPayment);
router.post('/:id/installment', protect, authorize('attendee', 'admin', 'organizer', 'staff'), require('../controllers/bookingController').initiateInstallment);
router.post('/verify-installment', protect, authorize('attendee', 'admin', 'organizer', 'staff'), require('../controllers/bookingController').verifyInstallment);
router.get('/mybookings', protect, getMyBookings);

module.exports = router;