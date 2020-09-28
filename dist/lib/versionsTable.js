"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.createForConfig = exports.createSchemaMigrations = void 0;
const utils_1 = require("./utils");
const schemaMigrationsSQL = 'CREATE TABLE schema_migrations ( version TEXT NOT NULL )';
exports.createSchemaMigrations = (db) => db.exec(schemaMigrationsSQL);
exports.createForConfig = async (config) => {
    const db = utils_1.adapter(config);
    await db.exec(schemaMigrationsSQL);
    db.close();
};
exports.create = async () => {
    let config;
    try {
        config = await utils_1.getConfig();
    }
    catch (err) {
        return;
    }
    for (let env in config) {
        const envConfig = config[env];
        exports.createForConfig(envConfig);
    }
};
