const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Image = sequelize.define(
    'Image',
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
        url: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        filename: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        isPrimary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: 'Images',
        freezeTableName: true,
        timestamps: true
    }
);

module.exports = Image;
