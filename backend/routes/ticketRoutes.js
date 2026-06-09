const express = require('express');
const {
    getTicket,
    downloadTicket,
    verifyTicket,
    verifyManualTicket,
    getTodayEvents,
    verifyTicketForStaff,
    verifyTicketScan,
    updateFoodAccess,
    updateParkingAccess,
    updateAddonsAccess
} = require('../controllers/ticketController');



const router = express.Router();

const { protect, authorize, optionalProtect } = require('../middleware/authMiddleware');

// ⚠️ IMPORTANT: Specific named routes MUST come before parameterized /:id routes
router.post('/verify-scan', protect, authorize('staff', 'admin'), verifyTicketScan);
router.post('/update-entry', protect, authorize('staff', 'admin'), require('../controllers/ticketController').updateEntryAccess);
router.post('/update-food', protect, authorize('staff', 'admin'), updateFoodAccess);
router.post('/update-parking', protect, authorize('staff', 'admin'), updateParkingAccess);
router.post('/update-addons', protect, authorize('staff', 'admin'), updateAddonsAccess);
router.get('/today', protect, authorize('staff', 'admin'), getTodayEvents);
router.get('/my-scans', protect, authorize('staff'), require('../controllers/ticketController').getMyScans);
router.post('/verify', protect, authorize('staff', 'admin'), verifyTicket);
router.post('/verify-manual', protect, authorize('staff', 'admin'), verifyManualTicket);
router.post('/create', protect, authorize('admin'), require('../controllers/ticketController').createTicket);
router.get('/verify/:id', protect, authorize('staff', 'admin'), verifyTicketForStaff);



router.get('/:id', optionalProtect, getTicket);
router.get('/:id/download', optionalProtect, downloadTicket);


module.exports = router;
