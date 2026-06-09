const express = require('express');
const {
    getEvents,
    getEvent,
    getMyEvents
} = require('../controllers/eventController');

const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

router
    .route('/')
    .get(optionalProtect, cacheMiddleware(30), getEvents);

router
    .route('/myevents')
    .get(protect, getMyEvents);

router
    .route('/:id')
    .get(optionalProtect, cacheMiddleware(30), getEvent);

module.exports = router;
