const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(BACKEND_ROOT, 'uploads');
const DATABASE_PATH = path.join(BACKEND_ROOT, 'database.sqlite');

const JWT_SECRET = process.env.JWT_SECRET || 'animal_rescue_map_danang_jwt_secret_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const GEO_BLUR_SECRET = process.env.GEO_BLUR_SECRET || 'animal_rescue_map_geo_blur_secret_2026';

const PIN_STATUSES = ['pending', 'treating', 'completed'];
const PIN_URGENCY_LEVELS = ['urgent', 'normal'];

const USER_ROLES = {
    ADMIN: 'admin',
    CITIZEN: 'Người dân',
    VOLUNTEER: 'Tình nguyện viên/Trạm cứu hộ'
};

const PUBLIC_REGISTER_ROLES = [USER_ROLES.CITIZEN, USER_ROLES.VOLUNTEER];

const SAMPLE_FILENAMES = new Set([
    'sample-dog-dragon-bridge.svg',
    'sample-cat-park.svg',
    'sample-rabbit-care.svg',
    'sample-dog-completed.svg',
    'sample-other-default.svg'
]);

const DEFAULT_ANIMAL_IMAGES = {
    'Chó': '/uploads/sample-dog-dragon-bridge.svg',
    'Mèo': '/uploads/sample-cat-park.svg',
    'Khác': '/uploads/sample-other-default.svg'
};

module.exports = {
    BACKEND_ROOT,
    UPLOADS_DIR,
    DATABASE_PATH,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    GEO_BLUR_SECRET,
    PIN_STATUSES,
    PIN_URGENCY_LEVELS,
    USER_ROLES,
    PUBLIC_REGISTER_ROLES,
    SAMPLE_FILENAMES,
    DEFAULT_ANIMAL_IMAGES
};
