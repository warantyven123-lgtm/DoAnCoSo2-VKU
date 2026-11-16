const { Pin, User, Image, sequelize } = require('../models');
const { PIN_STATUSES } = require('../config/constants');
const { formatPin, formatUser } = require('../utils/formatters');
const { removeUploadedFile } = require('../utils/fileHelpers');
const {
    PIN_FULL_INCLUDE,
    parsePositiveInt,
    findPinWithDetails,
    changePinStatus
} = require('../utils/pinService');

async function getStats(req, res, next) {
    try {
        const [pins, users] = await Promise.all([
            Pin.findAll({ attributes: ['status', 'urgency', 'isHidden', 'isSensitiveBlurred'] }),
            User.findAll({ attributes: ['isTrustedVolunteer', 'isLocked'] })
        ]);

        const total = pins.length;
        const pending = pins.filter((p) => p.status === 'pending').length;
        const treating = pins.filter((p) => p.status === 'treating').length;
        const completed = pins.filter((p) => p.status === 'completed').length;
        const hidden = pins.filter((p) => p.isHidden).length;
        const sensitiveBlurred = pins.filter((p) => p.isSensitiveBlurred).length;
        const urgent = pins.filter((p) => p.urgency === 'urgent').length;

        const userStats = {
            total: users.length,
            trustedVolunteers: users.filter((u) => u.isTrustedVolunteer).length,
            locked: users.filter((u) => u.isLocked).length
        };

        return res.status(200).json({
            total,
            pending,
            treating,
            completed,
            hidden,
            sensitiveBlurred,
            urgent,
            pins: {
                total,
                pending,
                treating,
                completed,
                hidden,
                sensitiveBlurred,
                urgent
            },
            users: userStats
        });
    } catch (err) {
        return next(err);
    }
}

async function getAdminPins(req, res, next) {
    try {
        const { status, search, q } = req.query;
        const where = {};

        if (status && status !== 'all') {
            if (!PIN_STATUSES.includes(status)) {
                return res.status(400).json({ message: 'Giá trị bộ lọc trạng thái không hợp lệ.' });
            }
            where.status = status;
        }

        const pins = await Pin.findAll({
            where,
            include: PIN_FULL_INCLUDE,
            order: [['createdAt', 'DESC'], ['id', 'DESC']]
        });

        const keyword = String(search || q || '').trim().toLowerCase();
        const filteredPins = keyword
            ? pins.filter((pin) => {
                const catName = pin.category ? pin.category.name : '';
                const haystack = `${pin.title} ${pin.address || ''} ${catName}`.toLowerCase();
                return haystack.includes(keyword);
            })
            : pins;

        return res.status(200).json({
            pins: filteredPins.map((pin) => formatPin(pin, { isAdmin: true })),
            total: filteredPins.length,
            hiddenCount: pins.filter((p) => p.isHidden).length
        });
    } catch (err) {
        return next(err);
    }
}

async function updateAdminPinStatus(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const body = req.body || {};
        const newStatus = String(body.status || '').trim();
        if (!PIN_STATUSES.includes(newStatus)) {
            return res.status(400).json({
                message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: pending, treating, completed.'
            });
        }

        const pin = await Pin.findByPk(pinId);
        if (!pin) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        const statusLog = await changePinStatus(pin, newStatus, req.user, body.note);
        const updatedPin = await findPinWithDetails(pin.id, true);

        return res.status(200).json({
            message: `Đã đổi trạng thái "${updatedPin.title}" thành: ${newStatus}`,
            pin: formatPin(updatedPin, { isAdmin: true }),
            statusLog
        });
    } catch (err) {
        return next(err);
    }
}

async function toggleHidePin(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const pin = await Pin.findByPk(pinId);
        if (!pin) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        const body = req.body || {};
        const nextHidden = typeof body.isHidden === 'boolean' ? body.isHidden : !pin.isHidden;

        pin.isHidden = nextHidden;
        await pin.save();

        const fullPin = await findPinWithDetails(pin.id, false);

        return res.status(200).json({
            message: nextHidden
                ? `Đã ẩn báo cáo "${pin.title}" khỏi bản đồ công khai.`
                : `Đã hiển thị lại báo cáo "${pin.title}".`,
            pin: formatPin(fullPin, { isAdmin: true })
        });
    } catch (err) {
        return next(err);
    }
}

async function toggleBlurPin(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const pin = await Pin.findByPk(pinId);
        if (!pin) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        const body = req.body || {};
        const nextBlurred = typeof body.isSensitiveBlurred === 'boolean'
            ? body.isSensitiveBlurred
            : !pin.isSensitiveBlurred;

        pin.isSensitiveBlurred = nextBlurred;
        await pin.save();

        const fullPin = await findPinWithDetails(pin.id, false);

        return res.status(200).json({
            message: nextBlurred
                ? `Đã bật làm mờ tọa độ cho "${pin.title}".`
                : `Đã khôi phục tọa độ chính xác cho "${pin.title}".`,
            pin: formatPin(fullPin, { isAdmin: true })
        });
    } catch (err) {
        return next(err);
    }
}

async function deleteSpamPin(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const pin = await Pin.findByPk(pinId, {
            include: [{ model: Image, as: 'images', attributes: ['id', 'filename'] }]
        });
        if (!pin) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        const pinTitle = pin.title;
        const filenames = Array.isArray(pin.images) ? pin.images.map((img) => img.filename) : [];

        await sequelize.transaction(async (transaction) => {
            await pin.destroy({ transaction });
        });

        filenames.forEach(removeUploadedFile);

        return res.status(200).json({
            message: `Đã xóa tin rác "${pinTitle}" khỏi hệ thống.`,
            deletedId: pinId
        });
    } catch (err) {
        return next(err);
    }
}

async function getUsers(req, res, next) {
    try {
        const users = await User.findAll({
            order: [['id', 'ASC']]
        });

        const keyword = String(req.query.search || req.query.q || '').trim().toLowerCase();
        const filteredUsers = keyword
            ? users.filter((u) => {
                const text = `${u.name} ${u.email} ${u.phone || ''} ${u.role}`.toLowerCase();
                return text.includes(keyword);
            })
            : users;

        return res.status(200).json({
            users: filteredUsers.map(formatUser),
            total: filteredUsers.length,
            trustedCount: users.filter((u) => u.isTrustedVolunteer).length,
            lockedCount: users.filter((u) => u.isLocked).length
        });
    } catch (err) {
        return next(err);
    }
}

async function toggleVolunteerBadge(req, res, next) {
    try {
        const userId = parsePositiveInt(req.params.id);
        if (!userId) {
            return res.status(400).json({ message: 'ID người dùng không hợp lệ.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy tài khoản người dùng.' });
        }

        const body = req.body || {};
        const nextBadge = typeof body.isTrustedVolunteer === 'boolean'
            ? body.isTrustedVolunteer
            : !user.isTrustedVolunteer;

        user.isTrustedVolunteer = nextBadge;
        await user.save();

        return res.status(200).json({
            message: nextBadge
                ? `Đã cấp huy hiệu Tình nguyện viên uy tín cho ${user.name}.`
                : `Đã gỡ huy hiệu Tình nguyện viên uy tín của ${user.name}.`,
            user: formatUser(user)
        });
    } catch (err) {
        return next(err);
    }
}

async function toggleLockUser(req, res, next) {
    try {
        const userId = parsePositiveInt(req.params.id);
        if (!userId) {
            return res.status(400).json({ message: 'ID người dùng không hợp lệ.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy tài khoản người dùng.' });
        }

        if (req.user && user.id === req.user.id) {
            return res.status(400).json({
                message: 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.'
            });
        }

        const body = req.body || {};
        const nextLocked = typeof body.isLocked === 'boolean' ? body.isLocked : !user.isLocked;

        user.isLocked = nextLocked;
        await user.save();

        return res.status(200).json({
            message: nextLocked
                ? `Đã khóa tài khoản ${user.name}.`
                : `Đã mở khóa tài khoản ${user.name}.`,
            user: formatUser(user)
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getStats,
    getAdminPins,
    updateAdminPinStatus,
    toggleHidePin,
    toggleBlurPin,
    deleteSpamPin,
    getUsers,
    toggleVolunteerBadge,
    toggleLockUser
};
