"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeSql_1 = __importDefault(require("./typeSql"));
const foreignKey_1 = require("./foreignKey");
const columnOptions = (options = {}) => {
    const sql = [];
    if (options.primaryKey)
        sql.push('PRIMARY KEY');
    if (options.null === false)
        sql.push('NOT NULL');
    if (options.default)
        sql.push('DEFAULT', options.default);
    return sql.join(' ');
};
exports.column = (name, type, options = {}) => {
    const sql = [name];
    sql.push(typeSql_1.default(type, options));
    const optionsSql = columnOptions(options);
    if (optionsSql)
        sql.push(optionsSql);
    return sql.join(' ');
};
exports.addColumn = (name, type, options = {}) => {
    let sql = exports.column(name, type, options);
    if (options.foreignKey)
        sql += ' ' + foreignKey_1.references(options.foreignKey);
    return sql;
};
exports.removeColumn = (name, type, options = {}) => {
    const sql = ['DROP COLUMN', name];
    if (typeof type === 'object')
        options = type;
    let { mode } = options;
    if (mode) {
        mode = mode.toUpperCase();
        sql.push(mode);
    }
    else {
        sql.push('CASCADE');
    }
    return sql.join(' ');
};
