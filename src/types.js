"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migration_1 = __importDefault(require("./lib/migration"));
exports.Migration = migration_1.default;
const table_1 = __importDefault(require("./lib/schema/table"));
exports.Table = table_1.default;
var ColumnTypes;
(function (ColumnTypes) {
    ColumnTypes["bigint"] = "bigint";
    ColumnTypes["bigserial"] = "bigserial";
    ColumnTypes["boolean"] = "boolean";
    ColumnTypes["date"] = "date";
    ColumnTypes["decimal"] = "decimal";
    ColumnTypes["float"] = "float8";
    ColumnTypes["integer"] = "integer";
    ColumnTypes["text"] = "text";
    ColumnTypes["smallint"] = "smallint";
    ColumnTypes["smallserial"] = "smallserial";
    ColumnTypes["string"] = "text";
    ColumnTypes["time"] = "time";
    ColumnTypes["timestamp"] = "timestamp";
    ColumnTypes["timestamptz"] = "timestamptz";
    ColumnTypes["binary"] = "bytea";
    ColumnTypes["serial"] = "serial";
})(ColumnTypes = exports.ColumnTypes || (exports.ColumnTypes = {}));
var IndexOnCallback;
(function (IndexOnCallback) {
    IndexOnCallback["noAction"] = "NO ACTION";
    IndexOnCallback["restrict"] = "RESTRICT";
    IndexOnCallback["cascade"] = "CASCADE";
    IndexOnCallback["setNull"] = "SET NULL";
    IndexOnCallback["nullify"] = "SET NULL";
    IndexOnCallback["setDefault"] = "SET DEFAULT";
})(IndexOnCallback = exports.IndexOnCallback || (exports.IndexOnCallback = {}));
