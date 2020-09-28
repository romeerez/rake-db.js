"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addForeignKey = exports.reference = exports.references = void 0;
const pluralize_1 = require("pluralize");
const utils_1 = require("../utils");
const types_1 = require("../../types");
const changeIndex = (table, addIndex, name, index) => {
    if (index === true)
        index = {};
    addIndex(utils_1.join(name, 'id'), index);
};
exports.references = ({ toTable, primaryKey = 'id', onDelete, onUpdate }) => {
    const sql = [];
    sql.push('REFERENCES', `"${toTable}"`, `("${primaryKey}")`);
    if (onDelete) {
        const value = types_1.IndexOnCallback[onDelete];
        if (value)
            sql.push('ON DELETE', value);
    }
    if (onUpdate) {
        const value = types_1.IndexOnCallback[onUpdate];
        if (value)
            sql.push('ON UPDATE', value);
    }
    return sql.join(' ');
};
exports.reference = (table, column, addIndex, name, { type = 'integer', ...options } = {}) => {
    table = pluralize_1.plural(table);
    name = pluralize_1.singular(name);
    if (options.foreignKey === true)
        options = { ...options, foreignKey: {} };
    if (typeof options.foreignKey === 'string')
        options = { ...options, foreignKey: { column: options.foreignKey } };
    if (typeof options.foreignKey === 'object')
        if (!options.foreignKey.toTable)
            options = { ...options, foreignKey: { ...options.foreignKey, toTable: pluralize_1.plural(name) } };
    if (typeof options !== 'object')
        utils_1.throwError(`Unexpected reference options: ${JSON.stringify(options)}`);
    let { index, ...withoutIndexOptions } = options;
    column(utils_1.join(name, 'id'), type, withoutIndexOptions);
    if (index)
        changeIndex(table, addIndex, name, index);
};
const getConstraintName = (table, foreignKey, options) => {
    if (options.name)
        return options.name;
    return utils_1.join(table, foreignKey, 'fkey');
};
exports.addForeignKey = (table, constraint, addIndex, name, options = {}) => {
    table = pluralize_1.plural(table);
    name = pluralize_1.singular(name);
    options = {
        toTable: pluralize_1.plural(name),
        primaryKey: `id`,
        ...options
    };
    let foreignKey = options.foreignKey;
    if (!foreignKey)
        foreignKey = utils_1.join(name, 'id');
    const sql = `FOREIGN KEY ("${foreignKey}") ${exports.references(options)}`;
    const constraintName = getConstraintName(table, foreignKey, options);
    constraint(constraintName, sql);
    if (options.index)
        changeIndex(table, addIndex, name, options.index);
};
