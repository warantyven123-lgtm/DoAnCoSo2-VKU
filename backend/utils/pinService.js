const { Pin, Category, Image, Comment, User, RescueStatusLog, sequelize } = require('../models');

const PIN_FULL_INCLUDE = [
    { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
    { model: Image, as: 'images', attributes: ['id', 'url', 'filename', 'isPrimary', 'createdAt'] },
    {
        model: Comment,
        as: 'comments',
        attributes: ['id', 'pinId', 'userId', 'authorName', 'content', 'createdAt'],
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'isTrustedVolunteer']
            }
        ]
    },
    {
        model: User,
        as: 'reporter',
        attributes: ['id', 'name', 'role', 'isTrustedVolunteer']
    }
];

function parsePositiveInt(value) {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) return null;
    return num;
}

async function findPinWithDetails(pinId, includeLogs = false) {
    const include = [...PIN_FULL_INCLUDE];
    if (includeLogs) {
        include.push({
            model: RescueStatusLog,
            as: 'statusLogs',
            attributes: ['id', 'pinId', 'userId', 'oldStatus', 'newStatus', 'changedBy', 'note', 'createdAt']
        });
    }

    return Pin.findByPk(pinId, { include });
}

async function resolveCategory({ categoryId, animalType, category }) {
    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        const parsedId = parsePositiveInt(categoryId);
        if (!parsedId) return null;
        return Category.findByPk(parsedId);
    }

    const rawType = String(animalType || category || 'Khác').trim();
    const normalized = rawType.toLowerCase();

    const slugMap = {
        'chó': 'dog',
        'cho': 'dog',
        'dog': 'dog',
        'mèo': 'cat',
        'meo': 'cat',
        'cat': 'cat',
        'khác': 'other',
        'khac': 'other',
        'other': 'other'
    };

    const mappedSlug = slugMap[normalized];
    if (mappedSlug) {
        return Category.findOne({ where: { slug: mappedSlug } });
    }

    return Category.findOne({ where: { name: rawType } });
}

async function changePinStatus(pin, newStatus, actorUser, note) {
    const oldStatus = pin.status;

    const statusLog = await sequelize.transaction(async (transaction) => {
        pin.status = newStatus;
        await pin.save({ transaction });

        return RescueStatusLog.create(
            {
                pinId: pin.id,
                userId: actorUser ? actorUser.id : null,
                oldStatus,
                newStatus,
                changedBy: actorUser ? actorUser.name : 'Tình nguyện viên',
                note: note ? String(note).trim() : `Cập nhật trạng thái từ "${oldStatus}" sang "${newStatus}"`
            },
            { transaction }
        );
    });

    return statusLog;
}

module.exports = {
    PIN_FULL_INCLUDE,
    parsePositiveInt,
    findPinWithDetails,
    resolveCategory,
    changePinStatus
};
