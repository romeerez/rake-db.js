"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeTable = void 0;
const table_1 = __importDefault(require("./table"));
const typeSql_1 = __importDefault(require("./typeSql"));
const index_1 = require("./index");
const column_1 = require("./column");
const foreignKey_1 = require("./foreignKey");
const utils_1 = require("../utils");
const addConstraint = (name, sql) => `ADD CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`;
const removeConstraint = (name) => `DROP CONSTRAINT "${name}"`;
class ChangeTable extends table_1.default {
    constructor() {
        super(...arguments);
        this.addColumnSql = (sql) => this.execute(`ADD COLUMN ${sql}`);
        this.constraint = (name, sql) => {
            this.execute(this.reverse ? removeConstraint(name) : addConstraint(name, sql));
        };
        this.removeConstraint = (name, sql) => this.execute(this.reverse ? addConstraint(name, sql) : removeConstraint(name));
        this.alterColumn = (name, sql) => this.execute(`ALTER COLUMN "${name}" ${sql}`);
        this.change = (name, options) => {
            const { reverse } = this;
            this.reverse = false;
            if (options.type && options.default || options.default === null)
                this.alterColumn(name, `DROP DEFAULT`);
            if (options.type)
                this.alterColumn(name, `TYPE ${typeSql_1.default(options.type, options)}`);
            if (options.default !== undefined)
                this.alterColumn(name, `SET DEFAULT ${options.default}`);
            if (options.null !== undefined)
                this.null(name, options.null);
            if (options.index)
                this.index(name, options.index);
            else if (options.index === false)
                this.removeIndex(name, options);
            if (options.hasOwnProperty('comment') && options.comment)
                this.comments.push([name, options.comment]);
            this.reverse = reverse;
        };
        this.comment = (column, message) => this.comments.push([column, message]);
        this.default = (column, value) => this.alterColumn(column, value === null ? 'DROP DEFAULT' : `SET DEFAULT ${value}`);
        this.null = (column, value) => this.alterColumn(column, value ? 'DROP NOT NULL' : 'SET NOT NULL');
        this.remove = (name, type, options) => {
            if (this.reverse)
                return this.addColumnSql(column_1.addColumn(`"${name}"`, type, options));
            this.execute(column_1.removeColumn(`"${name}"`, type, options));
        };
        this.removeIndex = (name, options = {}) => this.indices.push([this.reverse, name, options]);
        this.removeForeignKey = (name, options) => foreignKey_1.addForeignKey(this.tableName, this.removeConstraint, this.removeIndex, name, options);
        this.__commit = (db, fn) => {
            this.reverse = db.reverse;
            if (fn)
                fn(this);
            if (this.lines.length) {
                let sql = `ALTER TABLE "${this.tableName}"`;
                sql += '\n' + this.lines.join(',\n');
                db.exec(sql).catch(utils_1.noop);
            }
            for (let args of this.indices) {
                const [create, name, options] = args;
                if (create)
                    db.exec(index_1.addIndex(this.tableName, name, options)).catch(utils_1.noop);
                else
                    db.exec(index_1.removeIndex(this.tableName, name, options)).catch(utils_1.noop);
            }
            this.addComments(db);
        };
    }
}
exports.ChangeTable = ChangeTable;
