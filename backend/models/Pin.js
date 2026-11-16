const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { PIN_STATUSES, PIN_URGENCY_LEVELS } = require('../config/constants');

const Pin = sequelize.define(
    'Pin',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        address: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        lat: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            validate: {
                min: -90,
                max: 90
            }
        },
        lng: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            validate: {
                min: -180,
                max: 180
            }
        },
        urgency: {
            type: DataTypes.ENUM(...PIN_URGENCY_LEVELS),
            allowNull: false,
            defaultValue: 'normal'
        },
        status: {
            type: DataTypes.ENUM(...PIN_STATUSES),
            allowNull: false,
            defaultValue: 'pending'
        },
        isHidden: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        isSensitiveBlurred: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        tableName: 'Pins',
        freezeTableName: true,
        timestamps: true
    }
);

module.exports = Pin;
