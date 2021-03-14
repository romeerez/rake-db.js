import typeSql from './typeSql'
import { references } from './foreignKey'
import { ColumnOptions } from '../../types'

const columnOptions = (options: ColumnOptions = {}) => {
  const sql = []
  if (options.primaryKey) sql.push('PRIMARY KEY')
  if (options.null === false) sql.push('NOT NULL')
  if (options.default !== undefined) sql.push(`DEFAULT ${options.default}`)
  return sql.join(' ')
}

export const column = (
  name: string,
  type: string,
  options: ColumnOptions = {},
) => {
  const sql = [name]
  sql.push(typeSql(type, options))

  const optionsSql = columnOptions(options)
  if (optionsSql) sql.push(optionsSql)

  return sql.join(' ')
}

export const addColumn = (
  name: string,
  type: string,
  options: ColumnOptions = {},
) => {
  let sql = column(name, type, options)

  if (options.foreignKey) sql += ' ' + references(options.foreignKey)

  return sql
}

export const removeColumn = (
  name: string,
  type?: string | ColumnOptions,
  options: ColumnOptions = {},
) => {
  const sql = ['DROP COLUMN', name]
  if (typeof type === 'object') options = type
  let { mode } = options
  if (mode) {
    mode = mode.toUpperCase()
    sql.push(mode)
  } else {
    sql.push('CASCADE')
  }
  return sql.join(' ')
}
