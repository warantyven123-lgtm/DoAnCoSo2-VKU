const { DEFAULT_ANIMAL_IMAGES } = require('../config/constants');
const { blurCoordinates } = require('./geoBlur');

function formatRelativeTimeVi(dateInput) {
    if (!dateInput) return 'Vừa xong';
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return 'Vừa xong';

    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSeconds < 60) return 'Vừa xong';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN');
}

function formatUser(user) {
    if (!user) return null;
    const raw = typeof user.toJSON === 'function' ? user.toJSON() : user;

    return {
        id: raw.id,
        name: raw.name,
        email: raw.email,
        phone: raw.phone || '',
        role: raw.role,
        isTrustedVolunteer: Boolean(raw.isTrustedVolunteer),
        isLocked: Boolean(raw.isLocked),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };
}

function formatComment(comment) {
    if (!comment) return null;
    const raw = typeof comment.toJSON === 'function' ? comment.toJSON() : comment;

    return {
        id: raw.id,
        pinId: raw.pinId,
        userId: raw.userId ?? null,
        author: raw.authorName,
        authorName: raw.authorName,
        text: raw.content,
        content: raw.content,
        time: formatRelativeTimeVi(raw.createdAt),
        isTrustedVolunteer: raw.user ? Boolean(raw.user.isTrustedVolunteer) : false,
        createdAt: raw.createdAt
    };
}

function formatPin(pin, options = {}) {
    if (!pin) return null;
    const { isAdmin = false } = options;
    const raw = typeof pin.toJSON === 'function' ? pin.toJSON() : pin;

    const animalType = raw.category ? raw.category.name : 'Khác';
    const sortedImages = Array.isArray(raw.images)
        ? [...raw.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id)
        : [];

    const primaryImageUrl =
        (sortedImages[0] && sortedImages[0].url) ||
        DEFAULT_ANIMAL_IMAGES[animalType] ||
        DEFAULT_ANIMAL_IMAGES['Khác'];

    const shouldBlur = Boolean(raw.isSensitiveBlurred) && !isAdmin;
    const coords = shouldBlur
        ? blurCoordinates(raw.id, raw.lat, raw.lng)
        : { lat: Number(raw.lat), lng: Number(raw.lng) };

    const sortedComments = Array.isArray(raw.comments)
        ? [...raw.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id)
        : [];

    const payload = {
        id: raw.id,
        title: raw.title,
        animalType,
        categoryId: raw.categoryId,
        category: raw.category
            ? { id: raw.category.id, name: raw.category.name, slug: raw.category.slug }
            : null,
        urgency: raw.urgency,
        status: raw.status,
        lat: coords.lat,
        lng: coords.lng,
        address: raw.address || '',
        description: raw.description,
        image: primaryImageUrl,
        images: sortedImages.map((img) => ({
            id: img.id,
            url: img.url,
            isPrimary: Boolean(img.isPrimary),
            createdAt: img.createdAt
        })),
        isHidden: Boolean(raw.isHidden),
        isSensitiveBlurred: Boolean(raw.isSensitiveBlurred),
        userId: raw.userId ?? null,
        reporter: raw.reporter
            ? {
                id: raw.reporter.id,
                name: raw.reporter.name,
                role: raw.reporter.role,
                isTrustedVolunteer: Boolean(raw.reporter.isTrustedVolunteer)
            }
            : null,
        comments: sortedComments.map(formatComment),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt
    };

    if (Array.isArray(raw.statusLogs)) {
        payload.statusLogs = [...raw.statusLogs]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id - b.id)
            .map((log) => ({
                id: log.id,
                pinId: log.pinId,
                userId: log.userId ?? null,
                oldStatus: log.oldStatus,
                newStatus: log.newStatus,
                changedBy: log.changedBy || 'Hệ thống',
                note: log.note || '',
                createdAt: log.createdAt
            }));
    }

    return payload;
}

module.exports = {
    formatRelativeTimeVi,
    formatUser,
    formatComment,
    formatPin
};
