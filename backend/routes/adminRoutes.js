const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/pins', adminController.getAdminPins);
router.patch('/pins/:id/status', adminController.updateAdminPinStatus);
router.patch('/pins/:id/hide', adminController.toggleHidePin);
router.patch('/pins/:id/blur', adminController.toggleBlurPin);
router.delete('/pins/:id', adminController.deleteSpamPin);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/badge', adminController.toggleVolunteerBadge);
router.patch('/users/:id/lock', adminController.toggleLockUser);

module.exports = router;
