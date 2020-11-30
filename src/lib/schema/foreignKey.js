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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addForeignKey = exports.reference = exports.references = void 0;
var pluralize_1 = require("pluralize");
var utils_1 = require("../utils");
var types_1 = require("../../types");
var changeIndex = function (table, addIndex, name, index) {
    if (index === true)
        index = {};
    addIndex(utils_1.join(name, 'id'), index);
};
exports.references = function (_a) {
    var toTable = _a.toTable, _b = _a.primaryKey, primaryKey = _b === void 0 ? 'id' : _b, onDelete = _a.onDelete, onUpdate = _a.onUpdate;
    var sql = [];
    sql.push('REFERENCES', "\"" + toTable + "\"", "(\"" + primaryKey + "\")");
    if (onDelete) {
        var value = types_1.IndexOnCallback[onDelete];
        if (value)
            sql.push('ON DELETE', value);
    }
    if (onUpdate) {
        var value = types_1.IndexOnCallback[onUpdate];
        if (value)
            sql.push('ON UPDATE', value);
    }
    return sql.join(' ');
};
exports.reference = function (table, column, addIndex, name, _a) {
    if (_a === void 0) { _a = {}; }
    var _b = _a.type, type = _b === void 0 ? 'integer' : _b, options = __rest(_a, ["type"]);
    table = pluralize_1.plural(table);
    name = pluralize_1.singular(name);
    if (options.foreignKey === true)
        options = __assign(__assign({}, options), { foreignKey: {} });
    if (typeof options.foreignKey === 'string')
        options = __assign(__assign({}, options), { foreignKey: { column: options.foreignKey } });
    if (typeof options.foreignKey === 'object')
        if (!options.foreignKey.toTable)
            options = __assign(__assign({}, options), { foreignKey: __assign(__assign({}, options.foreignKey), { toTable: pluralize_1.plural(name) }) });
    if (typeof options !== 'object')
        utils_1.throwError("Unexpected reference options: " + JSON.stringify(options));
    var index = options.index, withoutIndexOptions = __rest(options, ["index"]);
    column(utils_1.join(name, 'id'), type, withoutIndexOptions);
    if (index)
        changeIndex(table, addIndex, name, index);
};
var getConstraintName = function (table, foreignKey, options) {
    if (options.name)
        return options.name;
    return utils_1.join(table, foreignKey, 'fkey');
};
exports.addForeignKey = function (table, constraint, addIndex, name, options) {
    if (options === void 0) { options = {}; }
    table = pluralize_1.plural(table);
    name = pluralize_1.singular(name);
    options = __assign({ toTable: pluralize_1.plural(name), primaryKey: "id" }, options);
    var foreignKey = options.foreignKey;
    if (!foreignKey)
        foreignKey = utils_1.join(name, 'id');
    var sql = "FOREIGN KEY (\"" + foreignKey + "\") " + exports.references(options);
    var constraintName = getConstraintName(table, foreignKey, options);
    constraint(constraintName, sql);
    if (options.index)
        changeIndex(table, addIndex, name, options.index);
};
