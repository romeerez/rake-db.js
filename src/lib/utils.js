"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pg_adapter_1 = require("pg-adapter");
exports.DbConfigsPath = () => process.env.DB_CONFIG_PATH;
exports.dbDirPath = () => process.env.DB_DIR_PATH || path_1.default.join(process.cwd(), 'db');
exports.dbMigratePath = () => path_1.default.join(exports.dbDirPath(), 'migrate');
const search = [
    'database.js',
    path_1.default.join('config', 'database.js'),
];
exports.readFile = (path) => new Promise((resolve, reject) => {
    fs_1.default.readFile(path, (err, content) => {
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
        search.forEach(filePath => fs_1.default.readFile(path_1.default.join(process.cwd(), filePath), callback));
    });
};
const parseConfig = async () => {
    const js = await getConfigSource();
    if (!js)
        throw new Error('Database config not found, expected to find it somewhere here:\n' +
            search.join('\n'));
    try {
        return eval(js.toString());
    }
    catch (err) {
        throw new Error(`Failed to parse database config: ${err.message}`);
    }
};
const validateConfig = (config) => {
    const invalidEnvs = [];
    for (let env in config) {
        if (config[env].url || config[env].database)
            return;
        invalidEnvs.push(env);
    }
    throw new Error('Invalid database config:\n' +
        `database option is required and not found in ${invalidEnvs.join(', ')} environments`);
};
let camelCase = true;
exports.getConfig = async () => {
    let config;
    const url = process.env.DATABASE_URL;
    config = url ? { default: pg_adapter_1.parseUrl(url) } : await parseConfig();
    if ('camelCase' in config) {
        camelCase = config.camelCase;
        delete config.camelCase;
    }
    validateConfig(config);
    return config;
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
