"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeIndex = exports.addIndex = void 0;
var utils_1 = require("../utils");
var getIndexName = function (table, name, options) {
    if (options === void 0) { options = {}; }
    return (options !== true && options.name) ||
        utils_1.join(table, Array.isArray(name) ? name[0] : name, 'index');
};
exports.addIndex = function (table, name, options) {
    if (options === void 0) { options = {}; }
    if (options === true)
        options = {};
    var sql = ['CREATE'];
    if (options.unique)
        sql.push('UNIQUE');
    sql.push('INDEX');
    var indexName = getIndexName(table, name, options);
    sql.push("\"" + indexName + "\"");
    var inner = "\"" + name + "\"";
    if (options.length)
        inner += "(" + options.length + ")";
    if (options.order)
        inner += " " + options.order;
    sql.push('ON', "\"" + table + "\"");
    if (options.using)
        sql.push('USING', options.using);
    sql.push("(" + inner + ")");
    if (options.including)
        sql.push('INCLUDING', "(" + (Array.isArray(options.including)
            ? options.including.join(', ')
            : options.including) + ")");
    if (options.with)
        sql.push('WITH', "(" + options.with + ")");
    if (options.tablespace)
        sql.push('TABLESPACE', options.tablespace);
    if (options.where)
        sql.push('WHERE', options.where);
    return sql.join(' ');
};
exports.removeIndex = function (table, name, options) {
    if (options === void 0) { options = {}; }
    var sql = ['DROP INDEX', "\"" + getIndexName(table, name, options) + "\""];
    var mode = options !== true && options.mode;
    if (mode) {
        mode = mode.toUpperCase();
        sql.push(mode);
    }
    return sql.join(' ');
};
