const { Pin, Category, Image, Comment, RescueStatusLog, User, sequelize } = require('../models');
const { PIN_STATUSES, PIN_URGENCY_LEVELS } = require('../config/constants');
const { isAdminUser } = require('../middleware/authMiddleware');
const { formatPin, formatComment } = require('../utils/formatters');
const { removeMulterFiles } = require('../utils/fileHelpers');
const {
    PIN_FULL_INCLUDE,
    parsePositiveInt,
    findPinWithDetails,
    resolveCategory,
    changePinStatus
} = require('../utils/pinService');

async function getCategories(req, res, next) {
    try {
        const categories = await Category.findAll({
            order: [['id', 'ASC']],
            attributes: ['id', 'name', 'slug', 'description']
        });
        return res.status(200).json({ categories });
    } catch (err) {
        return next(err);
    }
}

async function getPins(req, res, next) {
    try {
        const isAdmin = isAdminUser(req.user);
        const { status, urgency, animalType, category, categoryId, search, q, includeHidden } = req.query;

        const where = {};

        if (!(isAdmin && String(includeHidden) === 'true')) {
            where.isHidden = false;
        }

        if (status && status !== 'all') {
            if (!PIN_STATUSES.includes(status)) {
                return res.status(400).json({ message: 'Giá trị bộ lọc trạng thái (status) không hợp lệ.' });
            }
            where.status = status;
        }

        if (urgency && urgency !== 'all') {
            if (!PIN_URGENCY_LEVELS.includes(urgency)) {
                return res.status(400).json({ message: 'Giá trị bộ lọc khẩn cấp (urgency) không hợp lệ.' });
            }
            where.urgency = urgency;
        }

        if (categoryId) {
            const parsedCatId = parsePositiveInt(categoryId);
            if (!parsedCatId) {
                return res.status(400).json({ message: 'categoryId không hợp lệ.' });
            }
            where.categoryId = parsedCatId;
        } else if (animalType || category) {
            const matchedCategory = await resolveCategory({ animalType, category });
            if (matchedCategory) {
                where.categoryId = matchedCategory.id;
            } else {
                return res.status(200).json({
                    pins: [],
                    total: 0,
                    counts: { all: 0, pending: 0, treating: 0, completed: 0 }
                });
            }
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
                const haystack = `${pin.title} ${pin.address || ''} ${pin.description} ${catName}`.toLowerCase();
                return haystack.includes(keyword);
            })
            : pins;

        const visiblePinsForCount = await Pin.findAll({
            where: { isHidden: false },
            attributes: ['status']
        });
        const counts = {
            all: visiblePinsForCount.length,
            pending: visiblePinsForCount.filter((p) => p.status === 'pending').length,
            treating: visiblePinsForCount.filter((p) => p.status === 'treating').length,
            completed: visiblePinsForCount.filter((p) => p.status === 'completed').length
        };

        return res.status(200).json({
            pins: filteredPins.map((pin) => formatPin(pin, { isAdmin })),
            total: filteredPins.length,
            counts
        });
    } catch (err) {
        return next(err);
    }
}

async function getPinById(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const isAdmin = isAdminUser(req.user);
        const pin = await findPinWithDetails(pinId, true);

        if (!pin || (pin.isHidden && !isAdmin)) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        return res.status(200).json({
            pin: formatPin(pin, { isAdmin })
        });
    } catch (err) {
        return next(err);
    }
}

async function createPin(req, res, next) {
    const uploadedFiles = req.uploadedFiles || [];

    try {
        const body = req.body || {};
        const description = String(body.description || '').trim();
        const addressInput = String(body.address || '').trim();
        const rawTitle = String(body.title || '').trim();
        const urgency = String(body.urgency || 'normal').trim().toLowerCase();
        const lat = parseFloat(body.lat);
        const lng = parseFloat(body.lng);

        if (!description) {
            removeMulterFiles(uploadedFiles);
            return res.status(400).json({ message: 'Vui lòng nhập mô tả tình trạng động vật.' });
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            removeMulterFiles(uploadedFiles);
            return res.status(400).json({ message: 'Tọa độ (lat, lng) không hợp lệ.' });
        }

        if (!PIN_URGENCY_LEVELS.includes(urgency)) {
            removeMulterFiles(uploadedFiles);
            return res.status(400).json({ message: 'Mức độ khẩn cấp phải là "urgent" hoặc "normal".' });
        }

        const category = await resolveCategory({
            categoryId: body.categoryId,
            animalType: body.animalType,
            category: body.category
        });

        if (!category) {
            removeMulterFiles(uploadedFiles);
            return res.status(400).json({ message: 'Loại động vật / danh mục không hợp lệ.' });
        }

        const resolvedAddress = addressInput || `Đà Nẵng (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        const resolvedTitle = rawTitle || `${category.name} cần cứu trợ${addressInput ? ` • ${addressInput}` : ''}`;

        const createdPin = await sequelize.transaction(async (transaction) => {
            const pin = await Pin.create(
                {
                    title: resolvedTitle,
                    description,
                    address: resolvedAddress,
                    lat,
                    lng,
                    urgency,
                    status: 'pending',
                    isHidden: false,
                    isSensitiveBlurred: false,
                    userId: req.user ? req.user.id : null,
                    categoryId: category.id
                },
                { transaction }
            );

            if (uploadedFiles.length > 0) {
                const imageRows = uploadedFiles.map((file, index) => ({
                    pinId: pin.id,
                    url: `/uploads/${file.filename}`,
                    filename: file.filename,
                    isPrimary: index === 0
                }));
                await Image.bulkCreate(imageRows, { transaction });
            }

            await RescueStatusLog.create(
                {
                    pinId: pin.id,
                    userId: req.user ? req.user.id : null,
                    oldStatus: null,
                    newStatus: 'pending',
                    changedBy: req.user ? req.user.name : 'Người dân',
                    note: 'Tạo báo cáo cứu trợ mới'
                },
                { transaction }
            );

            return pin;
        });

        const fullPin = await findPinWithDetails(createdPin.id, true);

        return res.status(201).json({
            message: 'Đã gửi báo cáo cứu trợ mới lên bản đồ!',
            pin: formatPin(fullPin, { isAdmin: isAdminUser(req.user) })
        });
    } catch (err) {
        removeMulterFiles(uploadedFiles);
        return next(err);
    }
}

async function updatePinStatus(req, res, next) {
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

        const isAdmin = isAdminUser(req.user);
        const pin = await Pin.findByPk(pinId);
        if (!pin || (pin.isHidden && !isAdmin)) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        if (pin.status === newStatus) {
            const unchangedPin = await findPinWithDetails(pin.id, true);
            return res.status(200).json({
                message: 'Trạng thái không thay đổi.',
                pin: formatPin(unchangedPin, { isAdmin })
            });
        }

        const statusLog = await changePinStatus(pin, newStatus, req.user, body.note);
        const updatedPin = await findPinWithDetails(pin.id, true);

        return res.status(200).json({
            message: 'Đã cập nhật trạng thái cứu trợ!',
            pin: formatPin(updatedPin, { isAdmin }),
            statusLog
        });
    } catch (err) {
        return next(err);
    }
}

async function addPinComment(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const body = req.body || {};
        const content = String(body.text ?? body.content ?? '').trim();
        if (!content) {
            return res.status(400).json({ message: 'Vui lòng nhập nội dung bình luận.' });
        }
        if (content.length > 1000) {
            return res.status(400).json({ message: 'Bình luận tối đa 1000 ký tự.' });
        }

        const isAdmin = isAdminUser(req.user);
        const pin = await Pin.findByPk(pinId);
        if (!pin || (pin.isHidden && !isAdmin)) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        const customAuthor = String(body.author ?? body.authorName ?? '').trim();
        const authorName = customAuthor || (req.user ? req.user.name : 'Tình nguyện viên');

        const createdComment = await Comment.create({
            pinId: pin.id,
            userId: req.user ? req.user.id : null,
            authorName,
            content
        });

        const fullComment = await Comment.findByPk(createdComment.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'isTrustedVolunteer']
                }
            ]
        });

        return res.status(201).json({
            message: 'Đã đăng bình luận mới.',
            comment: formatComment(fullComment)
        });
    } catch (err) {
        return next(err);
    }
}

async function getPinLogs(req, res, next) {
    try {
        const pinId = parsePositiveInt(req.params.id);
        if (!pinId) {
            return res.status(400).json({ message: 'ID điểm cứu trợ không hợp lệ.' });
        }

        const isAdmin = isAdminUser(req.user);
        const pin = await Pin.findByPk(pinId);
        if (!pin || (pin.isHidden && !isAdmin)) {
            return res.status(404).json({ message: 'Không tìm thấy điểm cứu trợ.' });
        }

        const logs = await RescueStatusLog.findAll({
            where: { pinId: pin.id },
            order: [['createdAt', 'ASC'], ['id', 'ASC']]
        });

        return res.status(200).json({ logs });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getCategories,
    getPins,
    getPinById,
    createPin,
    updatePinStatus,
    addPinComment,
    getPinLogs
};
