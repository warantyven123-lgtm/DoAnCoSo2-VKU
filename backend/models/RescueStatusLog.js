const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { PIN_STATUSES } = require('../config/constants');

const RescueStatusLog = sequelize.define(
    'RescueStatusLog',
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
        oldStatus: {
            type: DataTypes.ENUM(...PIN_STATUSES),
            allowNull: true
        },
        newStatus: {
            type: DataTypes.ENUM(...PIN_STATUSES),
            allowNull: false
        },
        changedBy: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        note: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: 'RescueStatusLog',
        freezeTableName: true,
        timestamps: true
    }
);

module.exports = RescueStatusLog;
