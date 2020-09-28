"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollback = exports.migrate = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const migration_1 = __importDefault(require("./migration"));
const versionsTable_1 = require("./versionsTable");
const getMigratedVersionsQuery = (db) => db.value(`SELECT COALESCE(json_agg(schema_migrations.version ORDER BY version), '[]')` +
    `FROM schema_migrations`);
const getMigratedVersions = async (db) => {
    try {
        return await getMigratedVersionsQuery(db);
    }
    catch (err) {
        if (err.message === 'relation "schema_migrations" does not exist') {
            await versionsTable_1.createSchemaMigrations(db);
            return await getMigratedVersionsQuery(db);
        }
        else {
            throw err;
        }
    }
};
const getFiles = (rollback) => new Promise((resolve, reject) => {
    fs.readdir(utils_1.dbMigratePath(), (err, allFiles) => {
        if (err)
            return reject(err);
        if (rollback)
            allFiles.sort((a, b) => a < b ? 1 : -1);
        else
            allFiles.sort();
        const files = [];
        allFiles.forEach((file, i, all) => {
            const arr = file.split('_');
            const match = file.match(/\..+$/);
            if (!match)
                return;
            const ext = match[0];
            if (ext !== '.js')
                return;
            if (arr.length === 1)
                return;
            const version = arr[0];
            if (version.length !== 14)
                return;
            files.push({ version, path: file });
        });
        resolve(files);
    });
});
const run = (db, fn, version) => db.wrapperTransaction(db, async (t) => {
    fn(t, !db.reverse);
    await t.sync();
    if (t.failed)
        return;
    const sql = db.reverse ?
        `DELETE FROM schema_migrations WHERE version = '${version}'` :
        `INSERT INTO schema_migrations VALUES ('${version}')`;
    t.exec(sql).catch(utils_1.noop);
});
const migrateFile = async (db, version, file) => {
    const filePath = path.resolve(utils_1.dbMigratePath(), file);
    const migration = require(filePath);
    if (!db.reverse && !migration.up && !migration.change)
        utils_1.throwError(`Migration ${file} does not contain up or change exports`);
    else if (!migration.down && !migration.change)
        utils_1.throwError(`Migration ${file} does not contain down or change exports`);
    for (let key in migration)
        if (key === (db.reverse ? 'down' : 'up') || key === 'change')
            await run(db, migration[key], version);
    console.info(`${filePath} ${db.reverse ? 'rolled back' : 'migrated'}`);
};
const migrateDb = async (db, files) => {
    for (let { path, version } of files) {
        try {
            await migrateFile(db, version, path);
        }
        catch (err) {
            console.error(err);
            break;
        }
    }
};
const migrateOrRollback = async (rollback) => {
    let db;
    try {
        const configs = await utils_1.getConfig();
        for (let env in configs) {
            const config = configs[env];
            db = utils_1.adapter(config, migration_1.default, { reverse: rollback });
            await db.connect();
            let [files, versions] = (await Promise.all([getFiles(rollback), getMigratedVersions(db)]));
            versions = JSON.parse(versions);
            if (rollback) {
                const lastVersion = versions[versions.length - 1];
                if (!lastVersion) {
                    files = [];
                }
                else {
                    const lastFile = files.find(({ version }) => version === lastVersion);
                    files = [lastFile];
                }
            }
            else
                files = files.filter(file => !versions.includes(file.version));
            if (files.length)
                await migrateDb(db, files);
            db.close();
        }
    }
    catch (err) {
        if (db)
            db.close();
        console.error(err);
    }
};
exports.migrate = () => migrateOrRollback(false);
exports.rollback = () => migrateOrRollback(true);
