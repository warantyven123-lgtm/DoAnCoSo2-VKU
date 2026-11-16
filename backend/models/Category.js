const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define(
    'Category',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        slug: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: 'Categories',
        freezeTableName: true,
        timestamps: true
    }
);

module.exports = Category;
