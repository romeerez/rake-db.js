"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const table_1 = __importDefault(require("./table"));
const index_1 = require("./index");
const utils_1 = require("../utils");
class CreateTable extends table_1.default {
    constructor(tableName, reverse, options = {}) {
        super(tableName, reverse, options);
        this.addColumnSql = (sql) => this.execute(sql);
        this.constraint = (name, sql) => this.execute(`CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`);
        this.__commit = (db, fn) => {
            if (fn)
                fn(this);
            const sql = [];
            sql.push(`CREATE TABLE "${this.tableName}" (`);
            sql.push(this.lines.length ? '\n  ' + this.lines.join(',\n  ') : '');
            sql.push('\n)');
            db.exec(sql.join('')).catch(utils_1.noop);
            for (let args of this.indices) {
                const [create, name, options] = args;
                if (create)
                    db.exec(index_1.addIndex(this.tableName, name, options)).catch(utils_1.noop);
            }
            this.addComments(db);
        };
        if (options.id !== false) {
            this.reverse = false;
            this.serial('id', { primaryKey: true });
        }
    }
}
exports.CreateTable = CreateTable;
