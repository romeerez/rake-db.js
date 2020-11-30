"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwError = exports.noop = exports.join = exports.adapter = exports.getConfig = exports.readFile = exports.dbMigratePath = exports.dbDirPath = exports.DbConfigsPath = void 0;
var path = require("path");
var fs = require("fs");
var pg_adapter_1 = require("pg-adapter");
var dotenv_1 = require("dotenv");
exports.DbConfigsPath = function () { return process.env.DB_CONFIG_PATH; };
exports.dbDirPath = function () {
    return process.env.DB_DIR_PATH || path.join(process.cwd(), 'db');
};
exports.dbMigratePath = function () { return path.join(exports.dbDirPath(), 'migrate'); };
var search = ['database.js', path.join('config', 'database.js')];
exports.readFile = function (path) {
    return new Promise(function (resolve, reject) {
        fs.readFile(path, function (err, content) {
            if (err)
                return reject(err);
            resolve(content);
        });
    });
};
var getConfigSource = function () {
    var filePath = exports.DbConfigsPath();
    if (filePath)
        return exports.readFile(filePath);
    return new Promise(function (resolve) {
        var length = search.length;
        var data;
        var callback = function (err, content) {
            if (content)
                data = content;
            if (--length === 0)
                resolve(data);
        };
        search.forEach(function (filePath) {
            return fs.readFile(path.join(process.cwd(), filePath), callback);
        });
    });
};
var parseConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
    var js;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getConfigSource()];
            case 1:
                js = _a.sent();
                if (!js)
                    exports.throwError('Database config is not found!\n' +
                        'Please specify env variable DATABASE_URL=postgres://user:password@host:port/database in .env file or in command\n' +
                        'or put config to one of the files:\n' +
                        search.join('\n'));
                try {
                    return [2 /*return*/, eval(js.toString())];
                }
                catch (err) {
                    exports.throwError("Failed to parse database config: " + err.message);
                }
                return [2 /*return*/];
        }
    });
}); };
var validateConfig = function (config) {
    var invalidEnvs = [];
    var validConfigs = {};
    for (var env in config) {
        if (config[env].url || config[env].database)
            validConfigs[env] = config[env];
        else
            invalidEnvs.push(env);
    }
    if (Object.keys(validConfigs).length !== 0)
        return validConfigs;
    exports.throwError('Invalid database config:\n' +
        ("database option is required and not found in " + invalidEnvs.join(', ') + " environments"));
};
var getDatabaseUrlFromDotEnv = function () {
    var parsed = dotenv_1.config().parsed;
    return parsed && parsed.DATABASE_URL;
};
var camelCase = true;
var cacheConfig = undefined;
exports.getConfig = function () { return __awaiter(void 0, void 0, void 0, function () {
    var url, config, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!!cacheConfig) return [3 /*break*/, 3];
                url = process.env.DATABASE_URL || getDatabaseUrlFromDotEnv();
                _a = (url && { default: pg_adapter_1.parseUrl(url) });
                if (_a) return [3 /*break*/, 2];
                return [4 /*yield*/, parseConfig()];
            case 1:
                _a = (_b.sent());
                _b.label = 2;
            case 2:
                config = _a;
                if ('camelCase' in config) {
                    camelCase = config.camelCase;
                    delete config.camelCase;
                }
                cacheConfig = validateConfig(config);
                _b.label = 3;
            case 3: return [2 /*return*/, cacheConfig];
        }
    });
}); };
exports.adapter = function (config, Class, params) {
    if (Class === void 0) { Class = pg_adapter_1.Adapter; }
    if (params === void 0) { params = {}; }
    if (config.url)
        return Class.fromURL(config.url, __assign({ pool: 1, log: false }, params));
    else
        return new Class(__assign(__assign(__assign({}, config), { pool: 1, log: false }), params));
};
exports.join = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (camelCase)
        return (args[0] +
            args
                .slice(1)
                .map(function (word) { return word[0].toUpperCase() + word.slice(1); })
                .join(''));
    else
        return args.map(function (word) { return word.toLowerCase(); }).join('_');
};
exports.noop = function () {
    // noop
};
exports.throwError = function (message) {
    console.error(message);
    process.exit(1);
};
