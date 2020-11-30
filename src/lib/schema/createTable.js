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
exports.CreateTable = void 0;
var table_1 = require("./table");
var index_1 = require("./index");
var utils_1 = require("../utils");
var CreateTable = /** @class */ (function (_super) {
    __extends(CreateTable, _super);
    function CreateTable(tableName, reverse, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, tableName, reverse, options) || this;
        _this.addColumnSql = function (sql) { return _this.execute(sql); };
        _this.constraint = function (name, sql) {
            return _this.execute("CONSTRAINT " + (sql ? "\"" + name + "\" " + sql : name));
        };
        _this.__commit = function (db, fn) {
            if (fn)
                fn(_this);
            var sql = [];
            sql.push("CREATE TABLE \"" + _this.tableName + "\" (");
            sql.push(_this.lines.length ? '\n  ' + _this.lines.join(',\n  ') : '');
            sql.push('\n)');
            db.exec(sql.join('')).catch(utils_1.noop);
            for (var _i = 0, _a = _this.indices; _i < _a.length; _i++) {
                var args = _a[_i];
                var create = args[0], name_1 = args[1], options = args[2];
                if (create)
                    db.exec(index_1.addIndex(_this.tableName, name_1, options)).catch(utils_1.noop);
            }
            _this.addComments(db);
        };
        if (options.id !== false) {
            _this.reverse = false;
            _this.serial('id', { primaryKey: true });
        }
        return _this;
    }
    return CreateTable;
}(table_1.default));
exports.CreateTable = CreateTable;
