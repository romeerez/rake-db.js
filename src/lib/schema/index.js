const {join} = require('../utils')

const getIndexName = (table, name, options = {}) =>
  options.name || join(table, name, 'index')

exports.addIndex = (table, name, options = {}) => {
  const sql = ['CREATE']
  if (options.unique)
    sql.push('UNIQUE')
  sql.push('INDEX')
  const indexName = getIndexName(table, name, options)
  sql.push(indexName)

  if (options.polymorphic && !Array.isArray(name))
    name = [join(name, 'id'), join(name, 'type')]

  let inner
  if (Array.isArray(name))
    inner = name.map(name => {
      let result = name
      if (typeof options.length === 'object' && options.length[name])
        result += `(${options.length[name]})`
      if (typeof options.order === 'object' && options.order[name])
        result += ` ${options.order[name]}`
      return result
    }).join(', ')
  else {
    inner = name
    if (options.length)
      inner += `(${options.length})`
    if (options.order)
      inner += ` ${options.order}`
  }
  sql.push('ON', table)
  if (options.using)
    sql.push('USING', options.using)
  sql.push(`(${inner})`)
  if (options.including)
    sql.push(
      'INCLUDING',
      `(${Array.isArray(options.including) ? options.including.join(', ') : options.including})`
    )
  if (options.with)
    sql.push('WITH', `(${options.with})`)
  if (options.tablespace)
    sql.push('TABLESPACE', options.tablespace)
  if (options.where)
    sql.push('WHERE', options.where)
  return sql.join(' ')
}

exports.removeIndex = (table, name, options = {}) => {
  const sql = ['DROP INDEX', getIndexName(table, name, options)]
  let mode = options.mode
  if (mode) {
    mode = mode.toUpperCase()
    sql.push(mode)
  }
  return sql.join(' ')
}
