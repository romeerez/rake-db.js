import {join} from '../utils'
import {IndexOptions} from '../../types'

const getIndexName = (table: string, name: string, options: true | IndexOptions = {}) =>
  options !== true && options.name || join(table, Array.isArray(name) ? name[0] : name, 'index')

export const addIndex = (table: string, name: string, options: true | IndexOptions = {}) => {
  if (options === true)
    options = {}

  const sql = ['CREATE']
  if (options.unique)
    sql.push('UNIQUE')
  sql.push('INDEX')
  const indexName = getIndexName(table, name, options)
  sql.push(`"${indexName}"`)

  let inner = `"${name}"`
  if (options.length)
    inner += `(${options.length})`
  if (options.order)
    inner += ` ${options.order}`
  sql.push('ON', `"${table}"`)
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

export const removeIndex = (table: string, name: string, options: true | IndexOptions = {}) => {
  const sql = ['DROP INDEX', `"${getIndexName(table, name, options)}"`]
  let mode = options !== true && options.mode
  if (mode) {
    mode = mode.toUpperCase()
    sql.push(mode)
  }
  return sql.join(' ')
}
