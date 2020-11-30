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
var pg_adapter_1 = require("pg-adapter");
var createTable_1 = require("./schema/createTable");
var changeTable_1 = require("./schema/changeTable");
var pluralize_1 = require("pluralize");
var utils_1 = require("./utils");
var createTable = function (db, name, fn, options) { return new createTable_1.CreateTable(name, db.reverse, options).__commit(db, fn); };
var dropTable = function (db, name) {
    return db.exec("DROP TABLE \"" + pluralize_1.plural(name) + "\" CASCADE").catch(utils_1.noop);
};
var renameTable = function (db, from, to) {
    return db.exec("ALTER TABLE \"" + pluralize_1.plural(from) + "\" RENAME TO \"" + pluralize_1.plural(to) + "\"");
};
var createJoinTable = function (db, tableOne, tableTwo, options, cb) {
    var tableName;
    var columnOptions;
    var tableOptions;
    if (typeof options === 'object') {
        ;
        (tableName = options.tableName, columnOptions = options.columnOptions, options, tableOptions = __rest(options, ["tableName", "columnOptions"]));
    }
    var name = tableName || utils_1.join.apply(void 0, [tableOne, tableTwo].sort());
    columnOptions = __assign({ type: 'integer', null: false }, columnOptions);
    var fn = function (t) {
        t.belongsTo(tableOne, columnOptions);
        t.belongsTo(tableTwo, columnOptions);
        if (cb)
            cb(t);
    };
    return createTable(db, name, fn, tableOptions);
};
var dropJoinTable = function (db, tableOne, tableTwo, options) {
    var tableName = typeof options === 'object' ? options.tableName : undefined;
    dropTable(db, tableName || utils_1.join.apply(void 0, [tableOne, tableTwo].sort()));
};
var Migration = /** @class */ (function (_super) {
    __extends(Migration, _super);
    function Migration(_a) {
        var reverse = _a.reverse, params = __rest(_a, ["reverse"]);
        var _this = _super.call(this, params) || this;
        _this.reverse = reverse;
        return _this;
    }
    Migration.prototype.createTable = function (name, options, fn) {
        if (this.reverse)
            return dropTable(this, name);
        if (typeof options === 'function') {
            fn = options;
            options = {};
        }
        return createTable(this, name, fn, options);
    };
    Migration.prototype.changeTable = function (name, options, fn) {
        if (typeof options === 'function') {
            fn = options;
            options = {};
        }
        return new changeTable_1.ChangeTable(name, this.reverse, options).__commit(this, fn);
    };
    Migration.prototype.dropTable = function (name, options, fn) {
        if (this.reverse) {
            if (typeof options === 'function')
                return new createTable_1.CreateTable(name, this.reverse).__commit(this, options);
            else
                return new createTable_1.CreateTable(name, this.reverse, options).__commit(this, fn);
        }
        return dropTable(this, name);
    };
    Migration.prototype.renameTable = function (from, to) {
        if (this.reverse)
            renameTable(this, to, from);
        else
            renameTable(this, from, to);
    };
    Migration.prototype.addBelongsTo = function (table, name, options) {
        this.changeTable(table, function (t) { return t.belongsTo(name, options); });
    };
    Migration.prototype.addColumn = function (table, name, type, options) {
        this.changeTable(table, function (t) { return t.column(name, type, options); });
    };
    Migration.prototype.addForeignKey = function (table, name, options) {
        this.changeTable(table, function (t) { return t.foreignKey(name, options); });
    };
    Migration.prototype.addIndex = function (table, name, options) {
        this.changeTable(table, function (t) { return t.index(name, options); });
    };
    Migration.prototype.addReference = function (table, name, options) {
        this.changeTable(table, function (t) { return t.reference(name, options); });
    };
    Migration.prototype.addTimestamps = function (table, options) {
        this.changeTable(table, function (t) { return t.timestamps(options); });
    };
    Migration.prototype.changeColumn = function (table, name, options) {
        this.changeTable(table, function (t) { return t.change(name, options); });
    };
    Migration.prototype.changeColumnComment = function (table, column, comment) {
        this.changeTable(table, function (t) { return t.comment(column, comment); });
    };
    Migration.prototype.changeColumnDefault = function (table, column, value) {
        this.changeTable(table, function (t) { return t.default(column, value); });
    };
    Migration.prototype.changeColumnNull = function (table, column, value) {
        this.changeTable(table, function (t) { return t.null(column, value); });
    };
    Migration.prototype.changeTableComment = function (table, comment) {
        this.changeTable(table, { comment: comment });
    };
    Migration.prototype.columnExists = function (table, column) {
        var value = this.value('SELECT 1 FROM "information_schema"."columns" ' +
            ("WHERE \"table_name\" = '" + table + "' AND \"column_name\" = '" + column + "'"));
        return this.reverse ? !value : value;
    };
    Migration.prototype.createJoinTable = function (tableOne, tableTwo, options, cb) {
        if (this.reverse)
            return dropJoinTable(this, tableOne, tableTwo, options);
        createJoinTable(this, tableOne, tableTwo, options, cb);
    };
    Migration.prototype.dropJoinTable = function (tableOne, tableTwo, options, cb) {
        if (this.reverse)
            return createJoinTable(this, tableOne, tableTwo, options, cb);
        dropJoinTable(this, tableOne, tableTwo, options);
    };
    Migration.prototype.foreignKeyExists = function (fromTable, options) {
        var name;
        if (typeof options === 'string')
            name = utils_1.join(fromTable, pluralize_1.singular(options), 'id', 'fkey');
        else
            name = options.name || utils_1.join(fromTable, options.column, 'fkey');
        var value = this.value('SELECT 1 FROM "information_schema"."table_constraints" ' +
            ("WHERE \"constraint_name\" = '" + name + "'"));
        return this.reverse ? !value : value;
    };
    Migration.prototype.tableExists = function (table) {
        var value = this.value('SELECT FROM "information_schema"."tables" ' +
            ("WHERE \"table_name\" = '" + table + "'"));
        return this.reverse ? !value : value;
    };
    return Migration;
}(pg_adapter_1.Adapter));
exports.default = Migration;
