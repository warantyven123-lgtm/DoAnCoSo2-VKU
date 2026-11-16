const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN, USER_ROLES, PUBLIC_REGISTER_ROLES } = require('../config/constants');
const { formatUser } = require('../utils/formatters');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)[0-9]{8,10}$/;

function signAuthToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function normalizeRegisterRole(rawRole) {
    if (!rawRole) return USER_ROLES.CITIZEN;
    const trimmed = String(rawRole).trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'admin') {
        return 'ADMIN_FORBIDDEN';
    }
    if (lower === 'citizen' || lower === 'user' || lower === 'người dân') {
        return USER_ROLES.CITIZEN;
    }
    if (lower === 'volunteer' || lower === 'tình nguyện viên' || lower === 'tình nguyện viên/trạm cứu hộ') {
        return USER_ROLES.VOLUNTEER;
    }
    if (PUBLIC_REGISTER_ROLES.includes(trimmed)) {
        return trimmed;
    }
    return null;
}

async function register(req, res, next) {
    try {
        const body = req.body || {};
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const rawPhone = body.phone !== undefined && body.phone !== null ? String(body.phone) : '';
        const normalizedPhone = rawPhone.replace(/[\s.-]/g, '').trim();
        const password = String(body.password || '');
        const role = normalizeRegisterRole(body.role);

        if (name.length < 2) {
            return res.status(400).json({ message: 'Họ tên phải có ít nhất 2 ký tự.' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Địa chỉ email không hợp lệ.' });
        }
        if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
            return res.status(400).json({
                message: 'Số điện thoại không hợp lệ (9–11 chữ số, bắt đầu bằng 0 hoặc +84).'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }
        if (role === 'ADMIN_FORBIDDEN') {
            return res.status(403).json({ message: 'Không thể tự đăng ký tài khoản Quản trị viên.' });
        }
        if (!role) {
            return res.status(400).json({ message: 'Vai trò tham gia không hợp lệ.' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Email này đã được sử dụng.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const createdUser = await User.create({
            name,
            email,
            phone: normalizedPhone || null,
            password: hashedPassword,
            role,
            isTrustedVolunteer: false,
            isLocked: false
        });

        const token = signAuthToken(createdUser);

        return res.status(201).json({
            message: `Đăng ký thành công (${createdUser.role})!`,
            token,
            user: formatUser(createdUser)
        });
    } catch (err) {
        return next(err);
    }
}

async function login(req, res, next) {
    try {
        const body = req.body || {};
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (!EMAIL_REGEX.test(email) || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }

        if (user.isLocked) {
            return res.status(403).json({
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.'
            });
        }

        const token = signAuthToken(user);

        return res.status(200).json({
            message: 'Đăng nhập thành công!',
            token,
            user: formatUser(user)
        });
    } catch (err) {
        return next(err);
    }
}

async function getMe(req, res) {
    return res.status(200).json({
        user: formatUser(req.user)
    });
}

module.exports = {
    register,
    login,
    getMe
};
