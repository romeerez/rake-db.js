"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeTable = void 0;
var table_1 = require("./table");
var typeSql_1 = require("./typeSql");
var index_1 = require("./index");
var column_1 = require("./column");
var foreignKey_1 = require("./foreignKey");
var utils_1 = require("../utils");
var addConstraint = function (name, sql) {
    return "ADD CONSTRAINT " + (sql ? "\"" + name + "\" " + sql : name);
};
var removeConstraint = function (name) { return "DROP CONSTRAINT \"" + name + "\""; };
var ChangeTable = /** @class */ (function (_super) {
    __extends(ChangeTable, _super);
    function ChangeTable() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.addColumnSql = function (sql) { return _this.execute("ADD COLUMN " + sql); };
        _this.constraint = function (name, sql) {
            _this.execute(_this.reverse ? removeConstraint(name) : addConstraint(name, sql));
        };
        _this.removeConstraint = function (name, sql) {
            return _this.execute(_this.reverse ? addConstraint(name, sql) : removeConstraint(name));
        };
        _this.alterColumn = function (name, sql) {
            return _this.execute("ALTER COLUMN \"" + name + "\" " + sql);
        };
        _this.change = function (name, options) {
            var reverse = _this.reverse;
            _this.reverse = false;
            if ((options.type && options.default) || options.default === null)
                _this.alterColumn(name, "DROP DEFAULT");
            if (options.type)
                _this.alterColumn(name, "TYPE " + typeSql_1.default(options.type, options));
            if (options.default !== undefined)
                _this.alterColumn(name, "SET DEFAULT " + options.default);
            if (options.null !== undefined)
                _this.null(name, options.null);
            if (options.index)
                _this.index(name, options.index);
            else if (options.index === false)
                _this.removeIndex(name, options);
            if ('comment' in options && options.comment)
                _this.comments.push([name, options.comment]);
            _this.reverse = reverse;
        };
        _this.comment = function (column, message) {
            return _this.comments.push([column, message]);
        };
        _this.default = function (column, value) {
            return _this.alterColumn(column, value === null ? 'DROP DEFAULT' : "SET DEFAULT " + value);
        };
        _this.null = function (column, value) {
            return _this.alterColumn(column, value ? 'DROP NOT NULL' : 'SET NOT NULL');
        };
        _this.remove = function (name, type, options) {
            if (_this.reverse)
                return _this.addColumnSql(column_1.addColumn("\"" + name + "\"", type, options));
            _this.execute(column_1.removeColumn("\"" + name + "\"", type, options));
        };
        _this.removeIndex = function (name, options) {
            if (options === void 0) { options = {}; }
            return _this.indices.push([_this.reverse, name, options]);
        };
        _this.removeForeignKey = function (name, options) {
            return foreignKey_1.addForeignKey(_this.tableName, _this.removeConstraint, _this.removeIndex, name, options);
        };
        _this.__commit = function (db, fn) {
            _this.reverse = db.reverse;
            if (fn)
                fn(_this);
            if (_this.lines.length) {
                var sql = "ALTER TABLE \"" + _this.tableName + "\"";
                sql += '\n' + _this.lines.join(',\n');
                db.exec(sql).catch(utils_1.noop);
            }
            for (var _i = 0, _a = _this.indices; _i < _a.length; _i++) {
                var args = _a[_i];
                var create = args[0], name_1 = args[1], options = args[2];
                if (create)
                    db.exec(index_1.addIndex(_this.tableName, name_1, options)).catch(utils_1.noop);
                else
                    db.exec(index_1.removeIndex(_this.tableName, name_1, options)).catch(utils_1.noop);
            }
            _this.addComments(db);
        };
        return _this;
    }
    return ChangeTable;
}(table_1.default));
exports.ChangeTable = ChangeTable;
