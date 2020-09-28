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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const initConfig = `module.exports = {
  development: {
    database: 'dbname',
    user: '${process.env.USER || 'postgres'}',
    password: '',
    host: 'localhost',
    port: '5432',
  },
  camelCase: true,
}
`;
const createConfig = () => {
    const configPath = utils_1.DbConfigsPath() || path.join(process.cwd(), 'database.js');
    fs.access(configPath, (err) => {
        if (err)
            fs.writeFile(configPath, initConfig, (err) => {
                if (err)
                    throw err;
            });
    });
};
const createDbDir = (cb) => {
    const dirPath = utils_1.dbDirPath();
    fs.access(dirPath, (err) => {
        if (!err)
            return cb();
        fs.mkdir(dirPath, (err) => {
            if (err)
                throw err;
            cb();
        });
    });
};
const createMigrateDir = () => {
    createDbDir(() => {
        const migratePath = utils_1.dbMigratePath();
        fs.access(migratePath, (err) => {
            if (!err)
                return;
            fs.mkdir(migratePath, (err) => {
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
