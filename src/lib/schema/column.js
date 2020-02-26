const typeSql = require('./typeSql')
const {references} = require('./foreignKey')

const columnOptions = (options = {}) => {
  const sql = []
  if (options.primaryKey)
    sql.push('PRIMARY KEY')
  if (options.null === false)
    sql.push('NOT NULL')
  if (options.default)
    sql.push('DEFAULT', options.default)
  return sql.join(' ')
}

const column = (name, type, options = {}) => {
  const sql = [name]
  sql.push(typeSql(type, options))

  const optionsSql = columnOptions(options)
  if (optionsSql)
    sql.push(optionsSql)

  return sql.join(' ')
}

exports.column = column

exports.addColumn = (name, type, options = {}) => {
  let sql = column(name, type, options)

  if (options.foreignKey)
    sql += ' ' + references(options.foreignKey)

  return sql
}

exports.removeColumn = (name, type, options = {}) => {
  const sql = ['DROP COLUMN', name]
  if (typeof type === 'object')
    options = type
  let {mode} = options
  if (mode) {
    mode = mode.toUpperCase()
    sql.push(mode)
  } else {
    sql.push('CASCADE')
  }
  return sql.join(' ')
}
