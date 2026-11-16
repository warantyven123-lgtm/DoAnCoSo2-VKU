const express = require('express');
const pinController = require('../controllers/pinController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { uploadPinImages } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', optionalAuth, pinController.getPins);
router.get('/:id', optionalAuth, pinController.getPinById);
router.post('/', optionalAuth, uploadPinImages, pinController.createPin);
router.patch('/:id/status', optionalAuth, pinController.updatePinStatus);
router.put('/:id/status', optionalAuth, pinController.updatePinStatus);
router.post('/:id/comments', optionalAuth, pinController.addPinComment);
router.get('/:id/logs', optionalAuth, pinController.getPinLogs);

module.exports = router;
