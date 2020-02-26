const {plural, singular} = require('pluralize')

const changeIndex = (table, addIndex, name, index, polymorphic) => {
  if (index === true)
    index = {}
  if (polymorphic) {
    if (!index.name) index.name = `${table}_${name}_index`
    addIndex([`${name}_id`, `${name}_type`], index)
  } else {
    addIndex(`${name}_id`, index)
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
    options = {...options, foreignKey: {toTable: plural(name)}}
  else if (typeof options.foreignKey === 'object')
    if (!options.foreignKey.toTable)
      options = {...options, foreignKey: {...options.foreignKey, toTable: plural(name)}}

  if (polymorphic) {
    const {foreignKey, ...withoutForeignKey} = options
    options = withoutForeignKey
  }

  let {index, ...withoutIndexOptions} = options

  column(`${name}_id`, type, withoutIndexOptions)
  if (polymorphic) {
    const {index, ...typeOptions} = withoutIndexOptions
    column(`${name}_type`, 'text', typeOptions)
  }

  if (index)
    changeIndex(table, addIndex, name, index, polymorphic)
}

const getConstraintName = (table, foreignKey, options) => {
  if (options.name)
    return options.name
  if (options.polymorphic)
    return [`${table}_${foreignKey[0]}_fkey`, `${table}_${foreignKey[1]}_fkey`]
  else
    return `${table}_${foreignKey}_fkey`
}

exports.addForeignKey = (table, constraint, addIndex, name, options = {}) => {
  table = plural(table)
  name = singular(name)

  if (options.polymorphic) {
    options = {
      toTable: plural(name),
      ...options
    }
    const {foreignKey = [`${name}_id`, `${name}_type`]} = options
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

    const {foreignKey = `${name}_id`} = options
    const sql = `FOREIGN KEY (${foreignKey}) ${references(options)}`
    constraint(getConstraintName(table, foreignKey, options), sql)
  }

  if (options.index)
    changeIndex(table, addIndex, name, options.index, options.polymorphic)
}
