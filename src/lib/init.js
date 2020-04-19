"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const initConfig = `module.exports = {
  development: {
    database: 'dbname'
  },
  camelCase: true
}
`;
const createConfig = () => {
    const configPath = utils_1.DbConfigsPath() || path_1.default.join(process.cwd(), 'database.js');
    fs_1.default.access(configPath, (err) => {
        if (err)
            fs_1.default.writeFile(configPath, initConfig, (err) => {
                if (err)
                    throw err;
            });
    });
};
const createDbDir = (cb) => {
    const dirPath = utils_1.dbDirPath();
    fs_1.default.access(dirPath, (err) => {
        if (!err)
            return cb();
        fs_1.default.mkdir(dirPath, (err) => {
            if (err)
                throw err;
            cb();
        });
    });
};
const createMigrateDir = () => {
    createDbDir(() => {
        const migratePath = utils_1.dbMigratePath();
        fs_1.default.access(migratePath, (err) => {
            if (!err)
                return;
            fs_1.default.mkdir(migratePath, (err) => {
                if (err)
                    throw err;
            });
        });
    });
};
exports.default = () => {
    createConfig();
    createMigrateDir();
};
