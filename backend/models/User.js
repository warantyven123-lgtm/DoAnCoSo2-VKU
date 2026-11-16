const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { USER_ROLES } = require('../config/constants');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        role: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: USER_ROLES.CITIZEN
        },
        isTrustedVolunteer: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        isLocked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: 'Users',
        freezeTableName: true,
        timestamps: true
    }
);

module.exports = User;
