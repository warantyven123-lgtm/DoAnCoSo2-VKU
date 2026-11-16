const sequelize = require('../config/database');
const User = require('./User');
const Category = require('./Category');
const Pin = require('./Pin');
const Image = require('./Image');
const Comment = require('./Comment');
const RescueStatusLog = require('./RescueStatusLog');

// 1. User <-> Pin
User.hasMany(Pin, {
    foreignKey: 'userId',
    as: 'pins',
    onDelete: 'SET NULL'
});
Pin.belongsTo(User, {
    foreignKey: 'userId',
    as: 'reporter'
});

// 2. Category <-> Pin
Category.hasMany(Pin, {
    foreignKey: 'categoryId',
    as: 'pins',
    onDelete: 'RESTRICT'
});
Pin.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category'
});

// 3. Pin <-> Image
Pin.hasMany(Image, {
    foreignKey: 'pinId',
    as: 'images',
    onDelete: 'CASCADE',
    hooks: true
});
Image.belongsTo(Pin, {
    foreignKey: 'pinId',
    as: 'pin'
});

// 4. Pin <-> Comment
Pin.hasMany(Comment, {
    foreignKey: 'pinId',
    as: 'comments',
    onDelete: 'CASCADE',
    hooks: true
});
Comment.belongsTo(Pin, {
    foreignKey: 'pinId',
    as: 'pin'
});

// 5. User <-> Comment
User.hasMany(Comment, {
    foreignKey: 'userId',
    as: 'comments',
    onDelete: 'SET NULL'
});
Comment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// 6. Pin <-> RescueStatusLog
Pin.hasMany(RescueStatusLog, {
    foreignKey: 'pinId',
    as: 'statusLogs',
    onDelete: 'CASCADE',
    hooks: true
});
RescueStatusLog.belongsTo(Pin, {
    foreignKey: 'pinId',
    as: 'pin'
});

// 7. User <-> RescueStatusLog
User.hasMany(RescueStatusLog, {
    foreignKey: 'userId',
    as: 'statusLogs',
    onDelete: 'SET NULL'
});
RescueStatusLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'actor'
});

module.exports = {
    sequelize,
    User,
    Category,
    Pin,
    Image,
    Comment,
    RescueStatusLog
};
