const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR, SAMPLE_FILENAMES } = require('../config/constants');

function ensureUploadsDir() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}

function removeUploadedFile(filename) {
    if (!filename || SAMPLE_FILENAMES.has(filename)) return;

    const resolvedTarget = path.resolve(UPLOADS_DIR, path.basename(filename));
    if (!resolvedTarget.startsWith(UPLOADS_DIR)) return;

    if (fs.existsSync(resolvedTarget)) {
        try {
            fs.unlinkSync(resolvedTarget);
        } catch (err) {
            // Không chặn quy trình chính nếu file không còn tồn tại hoặc đang bận
        }
    }
}

function removeMulterFiles(files) {
    if (!Array.isArray(files)) return;
    files.forEach((file) => {
        if (file && file.filename) {
            removeUploadedFile(file.filename);
        }
    });
}

module.exports = {
    ensureUploadsDir,
    removeUploadedFile,
    removeMulterFiles
};
