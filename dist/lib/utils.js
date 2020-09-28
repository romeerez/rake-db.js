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
exports.throwError = exports.noop = exports.join = exports.adapter = exports.getConfig = exports.readFile = exports.dbMigratePath = exports.dbDirPath = exports.DbConfigsPath = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const pg_adapter_1 = require("pg-adapter");
const dotenv_1 = require("dotenv");
exports.DbConfigsPath = () => process.env.DB_CONFIG_PATH;
exports.dbDirPath = () => process.env.DB_DIR_PATH || path.join(process.cwd(), 'db');
exports.dbMigratePath = () => path.join(exports.dbDirPath(), 'migrate');
const search = [
    'database.js',
    path.join('config', 'database.js'),
];
exports.readFile = (path) => new Promise((resolve, reject) => {
    fs.readFile(path, (err, content) => {
        if (err)
            return reject(err);
        resolve(content);
    });
});
const getConfigSource = () => {
    const filePath = exports.DbConfigsPath();
    if (filePath)
        return exports.readFile(filePath);
    return new Promise((resolve) => {
        let { length } = search;
        let data;
        const callback = (err, content) => {
            if (content)
                data = content;
            if (--length === 0)
                resolve(data);
        };
        search.forEach(filePath => fs.readFile(path.join(process.cwd(), filePath), callback));
    });
};
const parseConfig = async () => {
    const js = await getConfigSource();
    if (!js)
        exports.throwError('Database config is not found!\n' +
            'Please specify env variable DATABASE_URL=postgres://user:password@host:port/database in .env file or in command\n' +
            'or put config to one of the files:\n' +
            search.join('\n'));
    try {
        return eval(js.toString());
    }
    catch (err) {
        exports.throwError(`Failed to parse database config: ${err.message}`);
    }
};
const validateConfig = (config) => {
    const invalidEnvs = [];
    let validConfigs = {};
    for (let env in config) {
        if (config[env].url || config[env].database)
            validConfigs[env] = config[env];
        else
            invalidEnvs.push(env);
    }
    if (Object.keys(validConfigs).length !== 0)
        return validConfigs;
    exports.throwError('Invalid database config:\n' +
        `database option is required and not found in ${invalidEnvs.join(', ')} environments`);
};
const getDatabaseUrlFromDotEnv = () => {
    const { parsed } = dotenv_1.config();
    return parsed && parsed.DATABASE_URL;
};
let camelCase = true;
let cacheConfig = undefined;
exports.getConfig = async () => {
    if (!cacheConfig) {
        let config;
        const url = process.env.DATABASE_URL || getDatabaseUrlFromDotEnv();
        config = url && { default: pg_adapter_1.parseUrl(url) } || await parseConfig();
        if ('camelCase' in config) {
            camelCase = config.camelCase;
            delete config.camelCase;
        }
        cacheConfig = validateConfig(config);
    }
    return cacheConfig;
};
exports.adapter = (config, Class = pg_adapter_1.Adapter, params = {}) => {
    if (config.url)
        return Class.fromURL(config.url, { pool: 1, log: false, ...params });
    else
        return new Class({ ...config, pool: 1, log: false, ...params });
};
exports.join = (...args) => {
    if (camelCase)
        return (args[0] +
            args.slice(1).map(word => word[0].toUpperCase() + word.slice(1)).join(''));
    else
        return args.map(word => word.toLowerCase()).join('_');
};
exports.noop = () => { };
exports.throwError = (message) => {
    console.error(message);
    process.exit(1);
};
