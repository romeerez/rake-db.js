"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_adapter_1 = require("pg-adapter");
const createTable_1 = require("./schema/createTable");
const changeTable_1 = require("./schema/changeTable");
const pluralize_1 = require("pluralize");
const utils_1 = require("./utils");
const createTable = (db, name, fn, options) => new createTable_1.CreateTable(name, db.reverse, options).__commit(db, fn);
const dropTable = (db, name) => db.exec(`DROP TABLE "${pluralize_1.plural(name)}" CASCADE`).catch(utils_1.noop);
const renameTable = (db, from, to) => db.exec(`ALTER TABLE "${pluralize_1.plural(from)}" RENAME TO "${pluralize_1.plural(to)}"`);
const createJoinTable = (db, tableOne, tableTwo, options, cb) => {
    let tableName;
    let columnOptions;
    let tableOptions;
    if (typeof options === 'object') {
        ({ tableName, columnOptions, ...tableOptions } = options);
    }
    const name = tableName || utils_1.join(...[tableOne, tableTwo].sort());
    columnOptions = { type: 'integer', null: false, ...columnOptions };
    const fn = (t) => {
        t.belongsTo(tableOne, columnOptions);
        t.belongsTo(tableTwo, columnOptions);
        if (cb)
            cb(t);
    };
    return createTable(db, name, fn, tableOptions);
};
const dropJoinTable = (db, tableOne, tableTwo, options) => {
    const tableName = typeof options === 'object' ? options.tableName : undefined;
    dropTable(db, tableName || utils_1.join(...[tableOne, tableTwo].sort()));
};
class Migration extends pg_adapter_1.Adapter {
    constructor({ reverse, ...params }) {
        super(params);
        this.reverse = reverse;
    }
    createTable(name, options, fn) {
        if (this.reverse)
            return dropTable(this, name);
        if (typeof options === 'function') {
            fn = options;
            options = {};
        }
        return createTable(this, name, fn, options);
    }
    changeTable(name, options, fn) {
        if (typeof options === 'function') {
            fn = options;
            options = {};
        }
        return new changeTable_1.ChangeTable(name, this.reverse, options).__commit(this, fn);
    }
    dropTable(name, options, fn) {
        if (this.reverse) {
            if (typeof options === 'function')
                return new createTable_1.CreateTable(name, this.reverse).__commit(this, options);
            else
                return new createTable_1.CreateTable(name, this.reverse, options).__commit(this, fn);
        }
        return dropTable(this, name);
    }
    renameTable(from, to) {
        if (this.reverse)
            renameTable(this, to, from);
        else
            renameTable(this, from, to);
    }
    addBelongsTo(table, name, options) {
        this.changeTable(table, (t) => t.belongsTo(name, options));
    }
    addColumn(table, name, type, options) {
        this.changeTable(table, (t) => t.column(name, type, options));
    }
    addForeignKey(table, name, options) {
        this.changeTable(table, (t) => t.foreignKey(name, options));
    }
    addIndex(table, name, options) {
        this.changeTable(table, (t) => t.index(name, options));
    }
    addReference(table, name, options) {
        this.changeTable(table, (t) => t.reference(name, options));
    }
    addTimestamps(table, options) {
        this.changeTable(table, (t) => t.timestamps(options));
    }
    changeColumn(table, name, options) {
        this.changeTable(table, (t) => t.change(name, options));
    }
    changeColumnComment(table, column, comment) {
        this.changeTable(table, (t) => t.comment(column, comment));
    }
    changeColumnDefault(table, column, value) {
        this.changeTable(table, (t) => t.default(column, value));
    }
    changeColumnNull(table, column, value) {
        this.changeTable(table, (t) => t.null(column, value));
    }
    changeTableComment(table, comment) {
        this.changeTable(table, { comment });
    }
    columnExists(table, column) {
        const value = this.value('SELECT 1 FROM "information_schema"."columns" ' +
            `WHERE "table_name" = '${table}' AND "column_name" = '${column}'`);
        return this.reverse ? !value : value;
    }
    createJoinTable(tableOne, tableTwo, options, cb) {
        if (this.reverse)
            return dropJoinTable(this, tableOne, tableTwo, options);
        createJoinTable(this, tableOne, tableTwo, options, cb);
    }
    dropJoinTable(tableOne, tableTwo, options, cb) {
        if (this.reverse)
            return createJoinTable(this, tableOne, tableTwo, options, cb);
        dropJoinTable(this, tableOne, tableTwo, options);
    }
    foreignKeyExists(fromTable, options) {
        let name;
        if (typeof options === 'string')
            name = utils_1.join(fromTable, pluralize_1.singular(options), 'id', 'fkey');
        else
            name = options.name || utils_1.join(fromTable, options.column, 'fkey');
        const value = this.value('SELECT 1 FROM "information_schema"."table_constraints" ' +
            `WHERE "constraint_name" = '${name}'`);
        return this.reverse ? !value : value;
    }
    tableExists(table) {
        const value = this.value('SELECT FROM "information_schema"."tables" ' +
            `WHERE "table_name" = '${table}'`);
        return this.reverse ? !value : value;
    }
}
exports.default = Migration;
