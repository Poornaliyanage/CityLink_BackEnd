const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');

router.post('/sync-user', verifyFirebaseToken, authController.syncUser);
router.get('/me', verifyFirebaseToken, authController.getCurrentUser);
router.get('/verify-token', verifyFirebaseToken, authController.verifyToken);

module.exports = router;