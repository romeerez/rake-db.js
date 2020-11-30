"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeColumn = exports.addColumn = exports.column = void 0;
var typeSql_1 = require("./typeSql");
var foreignKey_1 = require("./foreignKey");
var columnOptions = function (options) {
    if (options === void 0) { options = {}; }
    var sql = [];
    if (options.primaryKey)
        sql.push('PRIMARY KEY');
    if (options.null === false)
        sql.push('NOT NULL');
    if (options.default)
        sql.push('DEFAULT', options.default);
    return sql.join(' ');
};
exports.column = function (name, type, options) {
    if (options === void 0) { options = {}; }
    var sql = [name];
    sql.push(typeSql_1.default(type, options));
    var optionsSql = columnOptions(options);
    if (optionsSql)
        sql.push(optionsSql);
    return sql.join(' ');
};
exports.addColumn = function (name, type, options) {
    if (options === void 0) { options = {}; }
    var sql = exports.column(name, type, options);
    if (options.foreignKey)
        sql += ' ' + foreignKey_1.references(options.foreignKey);
    return sql;
};
exports.removeColumn = function (name, type, options) {
    if (options === void 0) { options = {}; }
    var sql = ['DROP COLUMN', name];
    if (typeof type === 'object')
        options = type;
    var mode = options.mode;
    if (mode) {
        mode = mode.toUpperCase();
        sql.push(mode);
    }
    else {
        sql.push('CASCADE');
    }
    return sql.join(' ');
};
