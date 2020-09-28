"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_adapter_1 = require("pg-adapter");
const column_1 = require("./column");
const foreignKey_1 = require("./foreignKey");
const timestamps_1 = __importDefault(require("./timestamps"));
const pluralize_1 = require("pluralize");
const utils_1 = require("../utils");
const reversableReference = (reverse, table, column, index, name, options) => {
    if (reverse)
        foreignKey_1.reference(table, column, utils_1.noop, name, options);
    else
        foreignKey_1.reference(table, column, index, name, options);
};
class Table {
    constructor(tableName, reverse, options = {}) {
        this.column = (name, type, options = {}) => {
            if (this.reverse)
                return this.execute(column_1.removeColumn(`"${name}"`));
            this.addColumnSql(column_1.addColumn(`"${name}"`, type, options));
            if (options.unique)
                if (options.index === true || !options.index)
                    options.index = { unique: true };
                else
                    options.index.unique = true;
            if (options.index)
                this.index(name, options.index);
            if (options.hasOwnProperty('comment'))
                this.comments.push([name, options.comment]);
        };
        this.index = (name, options) => {
            this.indices.push([!this.reverse, name, options]);
        };
        this.timestamps = (options) => timestamps_1.default(this.column, options);
        this.reference = (name, options) => reversableReference(this.reverse, this.tableName, this.column, this.index, name, options);
        this.belongsTo = (name, options) => reversableReference(this.reverse, this.tableName, this.column, this.index, name, options);
        this.foreignKey = (name, options) => foreignKey_1.addForeignKey(this.tableName, this.constraint, this.index, name, options);
        this.addComments = (db) => {
            if (this.reverse)
                return;
            const { tableName, comments } = this;
            if (this.options.hasOwnProperty('comment'))
                db.exec(`COMMENT ON TABLE "${tableName}" IS ${pg_adapter_1.quote(this.options.comment)}`).catch(utils_1.noop);
            for (let [column, message] of comments)
                db.exec(`COMMENT ON COLUMN "${tableName}"."${column}" IS ${pg_adapter_1.quote(message)}`).catch(utils_1.noop);
        };
        this.tableName = pluralize_1.plural(tableName);
        this.reverse = reverse;
        this.options = options;
        this.lines = [];
        this.indices = [];
        this.comments = [];
    }
    execute(sql) {
        this.lines.push(sql);
    }
    bigint(name, options) {
        this.column(name, 'bigint', options);
    }
    bigserial(name, options) {
        this.column(name, 'bigserial', options);
    }
    boolean(name, options) {
        this.column(name, 'boolean', options);
    }
    date(name, options) {
        this.column(name, 'date', options);
    }
    decimal(name, options) {
        this.column(name, 'decimal', options);
    }
    float(name, options) {
        this.column(name, 'float8', options);
    }
    integer(name, options) {
        this.column(name, 'integer', options);
    }
    text(name, options) {
        this.column(name, 'text', options);
    }
    smallint(name, options) {
        this.column(name, 'smallint', options);
    }
    smallserial(name, options) {
        this.column(name, 'smallserial', options);
    }
    string(name, options) {
        this.column(name, 'text', options);
    }
    time(name, options) {
        this.column(name, 'time', options);
    }
    timestamp(name, options) {
        this.column(name, 'timestamp', options);
    }
    timestamptz(name, options) {
        this.column(name, 'timestamptz', options);
    }
    binary(name, options) {
        this.column(name, 'bytea', options);
    }
    serial(name, options) {
        this.column(name, 'serial', options);
    }
}
exports.default = Table;
