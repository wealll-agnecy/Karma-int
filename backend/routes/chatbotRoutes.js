const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatbotController');

// Using standard protection middleware if needed, but since it's a help center,
// we might want it accessible to logged-in users only. Assuming we just need the route.
// If you want auth, you can add protect middleware here.
router.post('/', handleChat);

module.exports = router;
