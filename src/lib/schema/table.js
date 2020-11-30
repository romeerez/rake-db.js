"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pg_adapter_1 = require("pg-adapter");
var column_1 = require("./column");
var foreignKey_1 = require("./foreignKey");
var timestamps_1 = require("./timestamps");
var pluralize_1 = require("pluralize");
var utils_1 = require("../utils");
var reversableReference = function (reverse, table, column, index, name, options) {
    if (reverse)
        foreignKey_1.reference(table, column, utils_1.noop, name, options);
    else
        foreignKey_1.reference(table, column, index, name, options);
};
var Table = /** @class */ (function () {
    function Table(tableName, reverse, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        this.column = function (name, type, options) {
            if (options === void 0) { options = {}; }
            if (_this.reverse)
                return _this.execute(column_1.removeColumn("\"" + name + "\""));
            _this.addColumnSql(column_1.addColumn("\"" + name + "\"", type, options));
            if (options.unique)
                if (options.index === true || !options.index)
                    options.index = { unique: true };
                else
                    options.index.unique = true;
            if (options.index)
                _this.index(name, options.index);
            if ('comment' in options)
                _this.comments.push([name, options.comment]);
        };
        this.index = function (name, options) {
            _this.indices.push([!_this.reverse, name, options]);
        };
        this.timestamps = function (options) { return timestamps_1.default(_this.column, options); };
        this.reference = function (name, options) {
            return reversableReference(_this.reverse, _this.tableName, _this.column, _this.index, name, options);
        };
        this.belongsTo = function (name, options) {
            return reversableReference(_this.reverse, _this.tableName, _this.column, _this.index, name, options);
        };
        this.foreignKey = function (name, options) {
            return foreignKey_1.addForeignKey(_this.tableName, _this.constraint, _this.index, name, options);
        };
        this.addComments = function (db) {
            if (_this.reverse)
                return;
            var _a = _this, tableName = _a.tableName, comments = _a.comments;
            if ('comment' in _this.options)
                db.exec("COMMENT ON TABLE \"" + tableName + "\" IS " + pg_adapter_1.quote(_this.options.comment)).catch(utils_1.noop);
            for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
                var _b = comments_1[_i], column = _b[0], message = _b[1];
                db.exec("COMMENT ON COLUMN \"" + tableName + "\".\"" + column + "\" IS " + pg_adapter_1.quote(message)).catch(utils_1.noop);
            }
        };
        this.tableName = pluralize_1.plural(tableName);
        this.reverse = reverse;
        this.options = options;
        this.lines = [];
        this.indices = [];
        this.comments = [];
    }
    Table.prototype.execute = function (sql) {
        this.lines.push(sql);
    };
    Table.prototype.bigint = function (name, options) {
        this.column(name, 'bigint', options);
    };
    Table.prototype.bigserial = function (name, options) {
        this.column(name, 'bigserial', options);
    };
    Table.prototype.boolean = function (name, options) {
        this.column(name, 'boolean', options);
    };
    Table.prototype.date = function (name, options) {
        this.column(name, 'date', options);
    };
    Table.prototype.decimal = function (name, options) {
        this.column(name, 'decimal', options);
    };
    Table.prototype.float = function (name, options) {
        this.column(name, 'float8', options);
    };
    Table.prototype.integer = function (name, options) {
        this.column(name, 'integer', options);
    };
    Table.prototype.text = function (name, options) {
        this.column(name, 'text', options);
    };
    Table.prototype.smallint = function (name, options) {
        this.column(name, 'smallint', options);
    };
    Table.prototype.smallserial = function (name, options) {
        this.column(name, 'smallserial', options);
    };
    Table.prototype.string = function (name, options) {
        this.column(name, 'text', options);
    };
    Table.prototype.time = function (name, options) {
        this.column(name, 'time', options);
    };
    Table.prototype.timestamp = function (name, options) {
        this.column(name, 'timestamp', options);
    };
    Table.prototype.timestamptz = function (name, options) {
        this.column(name, 'timestamptz', options);
    };
    Table.prototype.binary = function (name, options) {
        this.column(name, 'bytea', options);
    };
    Table.prototype.serial = function (name, options) {
        this.column(name, 'serial', options);
    };
    return Table;
}());
exports.default = Table;
