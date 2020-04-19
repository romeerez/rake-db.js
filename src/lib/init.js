"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const initConfig = `{
  "development": {
    
  },
  "camelCase": true
}`;
exports.createConfig = () => {
    const configPath = utils_1.dbConfigPath() || path_1.default.join(process.cwd(), 'database.json');
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
exports.createMigrateDir = () => {
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
