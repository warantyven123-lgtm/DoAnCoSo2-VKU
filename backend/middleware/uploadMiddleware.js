const crypto = require('crypto');
const multer = require('multer');
const { UPLOADS_DIR } = require('../config/constants');
const { ensureUploadsDir } = require('../utils/fileHelpers');

const ALLOWED_MIME_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadsDir();
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = ALLOWED_MIME_EXTENSIONS[file.mimetype] || '.jpg';
        const randomSuffix = crypto.randomBytes(6).toString('hex');
        cb(null, `pin-${Date.now()}-${randomSuffix}${ext}`);
    }
});

function imageFileFilter(req, file, cb) {
    if (!file || !ALLOWED_MIME_EXTENSIONS[file.mimetype]) {
        const err = new Error('Vui lòng chọn đúng định dạng tệp hình ảnh (JPG, PNG, WEBP, GIF, SVG).');
        err.statusCode = 400;
        return cb(err);
    }
    cb(null, true);
}

const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 5
    }
});

const uploadFields = upload.fields([
    { name: 'image', maxCount: 5 },
    { name: 'images', maxCount: 5 },
    { name: 'file', maxCount: 5 },
    { name: 'photo', maxCount: 5 }
]);

function uploadPinImages(req, res, next) {
    uploadFields(req, res, (err) => {
        if (err) {
            return next(err);
        }

        const collected = [];
        if (req.files && typeof req.files === 'object') {
            ['image', 'images', 'file', 'photo'].forEach((field) => {
                if (Array.isArray(req.files[field])) {
                    collected.push(...req.files[field]);
                }
            });
        }
        req.uploadedFiles = collected;
        next();
    });
}

module.exports = {
    uploadPinImages
};
