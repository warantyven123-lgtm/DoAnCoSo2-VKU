const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define(
    'Comment',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        pinId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        authorName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'Tình nguyện viên'
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    },
    {
        tableName: 'Comments',
        freezeTableName: true,
        timestamps: true
    }
);

module.exports = Comment;
