const express = require('express');
const { syncUser, getMe, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/signup', syncUser);
router.post('/auth/sync', syncUser);
router.get('/auth/me', requireAuth, getMe);
router.get('/auth/session', requireAuth, getMe);
router.put('/user/profile', requireAuth, updateProfile);

module.exports = router;