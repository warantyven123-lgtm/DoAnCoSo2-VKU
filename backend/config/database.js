const { Sequelize } = require('sequelize');
const { DATABASE_PATH } = require('./constants');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: DATABASE_PATH,
    logging: false,
    hooks: {
        afterConnect: async (connection) => {
            await new Promise((resolve, reject) => {
                connection.run('PRAGMA foreign_keys = ON;', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }
    }
});

module.exports = sequelize;
