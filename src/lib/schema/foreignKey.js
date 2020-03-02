const {plural, singular} = require('pluralize')
const {join} = require('../utils')

const changeIndex = (table, addIndex, name, index, polymorphic) => {
  if (index === true)
    index = {}
  if (polymorphic) {
    if (!index.name) index.name = join(table, name, 'index')
    addIndex([join(name, 'id'), join(name, 'type')], index)
  } else {
    addIndex(join(name, 'id'), index)
  }
}

const mapAction = {
  noAction: 'NO ACTION',
  restrict: 'RESTRICT',
  cascade: 'CASCADE',
  setNull: 'SET NULL',
  nullify: 'SET NULL',
  setDefault: 'SET DEFAULT',
}

const references = ({toTable, primaryKey = 'id', onDelete, onUpdate}) => {
  const sql = []
  sql.push(
    'REFERENCES',
    toTable,
    `(${primaryKey})`
  )
  if (onDelete) {
    const value = mapAction[onDelete]
    if (value)
      sql.push('ON DELETE', value)
  }
  if (onUpdate) {
    const value = mapAction[onUpdate]
    if (value)
      sql.push('ON UPDATE', value)
  }
  return sql.join(' ')
}


exports.references = references

exports.reference = (table, column, addIndex, name, {polymorphic, type = 'integer', ...options} = {}) => {
  table = plural(table)
  name = singular(name)

  if (options.foreignKey === true)
    options = {...options, foreignKey: {}}
  if (typeof options.foreignKey === 'string')
    options = {...options, foreignKey: {column: options.foreignKey}}
  if (typeof options.foreignKey === 'object')
    if (!options.foreignKey.toTable)
      options = {...options, foreignKey: {...options.foreignKey, toTable: plural(name)}}

  if (polymorphic) {
    const {foreignKey, ...withoutForeignKey} = options
    options = withoutForeignKey
  }

  let {index, ...withoutIndexOptions} = options

  column(join(name, 'id'), type, withoutIndexOptions)
  if (polymorphic) {
    const {index, ...typeOptions} = withoutIndexOptions
    column(join(name, 'type'), 'text', typeOptions)
  }

  if (index)
    changeIndex(table, addIndex, name, index, polymorphic)
}

const getConstraintName = (table, foreignKey, options) => {
  if (options.name)
    return options.name
  if (options.polymorphic)
    return [join(table, foreignKey[0], 'fkey'), join(table, foreignKey[1], 'fkey')]
  else
    return join(table, foreignKey, 'fkey')
}

exports.addForeignKey = (table, constraint, addIndex, name, options = {}) => {
  table = plural(table)
  name = singular(name)

  if (options.polymorphic) {
    options = {
      toTable: plural(name),
      ...options
    }
    const {foreignKey = [join(name, 'id'), join(name, 'type')]} = options
    const {primaryKey = ['id', 'type']} = options
    const constraintName = getConstraintName(table, foreignKey, options)

    let sql = `FOREIGN KEY (${foreignKey[0]}) ${references({...options, primaryKey: primaryKey[0]})}`
    constraint(constraintName[0], sql)

    sql = `FOREIGN KEY (${foreignKey[1]}) ${references({...options, primaryKey: primaryKey[1]})}`
    constraint(constraintName[1], sql)
  } else {
    options = {
      toTable: plural(name),
      primaryKey: `id`,
      ...options
    }

    const {foreignKey = join(name, 'id')} = options
    const sql = `FOREIGN KEY (${foreignKey}) ${references(options)}`
    constraint(getConstraintName(table, foreignKey, options), sql)
  }

  if (options.index)
    changeIndex(table, addIndex, name, options.index, options.polymorphic)
}
