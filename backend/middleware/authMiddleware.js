const jwt = require('jsonwebtoken');
const { JWT_SECRET, USER_ROLES } = require('../config/constants');
const { User } = require('../models');

function extractBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return null;

    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    return parts[1] || null;
}

async function resolveUserFromToken(token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) return null;
    const user = await User.findByPk(decoded.id);
    return user || null;
}

async function authenticateToken(req, res, next) {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            return res.status(401).json({ message: 'Vui lòng đăng nhập (thiếu JWT Token).' });
        }

        const user = await resolveUserFromToken(token);
        if (!user) {
            return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc token không hợp lệ.' });
        }

        if (user.isLocked) {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'JWT Token không hợp lệ hoặc đã hết hạn.' });
    }
}

async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        req.user = null;
        return next();
    }

    const token = extractBearerToken(req);
    if (!token) {
        if (req.method === 'GET') {
            req.user = null;
            return next();
        }
        return res.status(401).json({ message: 'Định dạng Authorization Bearer token không hợp lệ.' });
    }

    try {
        const user = await resolveUserFromToken(token);
        if (!user) {
            if (req.method === 'GET') {
                req.user = null;
                return next();
            }
            return res.status(401).json({ message: 'Token không hợp lệ hoặc tài khoản không tồn tại.' });
        }

        if (user.isLocked) {
            if (req.method === 'GET') {
                req.user = null;
                return next();
            }
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
        }

        req.user = user;
        return next();
    } catch (err) {
        if (req.method === 'GET') {
            req.user = null;
            return next();
        }
        return res.status(401).json({ message: 'JWT Token không hợp lệ hoặc đã hết hạn.' });
    }
}

function isAdminUser(user) {
    return Boolean(user && String(user.role || '').toLowerCase() === USER_ROLES.ADMIN);
}

function requireAdmin(req, res, next) {
    if (!isAdminUser(req.user)) {
        return res.status(403).json({ message: 'Chỉ Quản trị viên (Admin) mới có quyền thực hiện thao tác này.' });
    }
    return next();
}

module.exports = {
    authenticateToken,
    optionalAuth,
    requireAdmin,
    isAdminUser
};
