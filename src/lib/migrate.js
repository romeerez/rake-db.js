"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const migration_1 = __importDefault(require("./migration"));
const getMigratedVersions = (db) => db.value(`SELECT COALESCE(json_agg(schema_migrations.version ORDER BY version), '[]')` +
    `FROM schema_migrations`);
const getFiles = (rollback) => new Promise((resolve, reject) => {
    fs_1.default.readdir(utils_1.dbMigratePath(), (err, allFiles) => {
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
const run = (db, fn, version) => {
    const { promise } = db.wrapperTransaction(db, async (t) => {
        fn(t);
        await t.sync();
        const sql = db.reverse ?
            `DELETE FROM schema_migrations WHERE version = '${version}'` :
            `INSERT INTO schema_migrations VALUES ('${version}')`;
        t.exec(sql).catch(utils_1.noop);
    });
    return promise;
};
const migrateFile = async (db, version, file) => {
    const filePath = path_1.default.resolve(utils_1.dbMigratePath(), file);
    const migration = require(filePath);
    if (!db.reverse && !migration.up && !migration.change)
        throw new Error(`Migration ${file} does not contain up or change exports`);
    else if (!migration.down && !migration.change)
        throw new Error(`Migration ${file} does not contain down or change exports`);
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
