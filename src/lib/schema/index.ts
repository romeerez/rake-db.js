import { join } from '../utils'
import { IndexOptions } from '../../types'

const getIndexName = (
  table: string,
  column: string | string[],
  options: true | IndexOptions = {},
) =>
  (options !== true && options.name) ||
  join(table, Array.isArray(column) ? column[0] : column, 'index')

const getIndexColumns = (
  table: string,
  column: string | string[],
  options: IndexOptions = {},
): string => {
  if (Array.isArray(column))
    return column.map((col) => getIndexColumns(table, col, options)).join(', ')
  else {
    let sql = `"${column}"`
    if (options.length) sql += `(${options.length})`
    if (options.order) sql += ` ${options.order}`
    return sql
  }
}

export const addIndex = (
  table: string,
  column: string | string[],
  options: true | IndexOptions = {},
) => {
  if (options === true) options = {}

  const sql = ['CREATE']
  if (options.unique) sql.push('UNIQUE')
  sql.push('INDEX')
  const indexName = getIndexName(table, column, options)
  sql.push(`"${indexName}"`)

  sql.push('ON', `"${table}"`)
  if (options.using) sql.push('USING', options.using)
  sql.push(`(${getIndexColumns(table, column, options)})`)
  if (options.including)
    sql.push(
      'INCLUDING',
      `(${
        Array.isArray(options.including)
          ? options.including.join(', ')
          : options.including
      })`,
    )
  if (options.with) sql.push('WITH', `(${options.with})`)
  if (options.tablespace) sql.push('TABLESPACE', options.tablespace)
  if (options.where) sql.push('WHERE', options.where)
  return sql.join(' ')
}

export const removeIndex = (
  table: string,
  column: string | string[],
  options: true | IndexOptions = {},
) => {
  const sql = ['DROP INDEX', `"${getIndexName(table, column, options)}"`]
  let mode = options !== true && options.mode
  if (mode) {
    mode = mode.toUpperCase()
    sql.push(mode)
  }
  return sql.join(' ')
}
