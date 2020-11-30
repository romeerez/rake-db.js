import { ColumnOptions } from '../../types'

export default (type: string, options: ColumnOptions = {}) => {
  const sql = [type]
  if (options.length) sql.push(`(${options.length})`)
  else if (options.precision !== undefined && options.scale === undefined)
    sql.push(`(${options.precision})`)
  else if (options.precision === undefined && options.scale !== undefined)
    sql.push(`(${options.scale})`)
  else if (options.precision !== undefined && options.scale !== undefined)
    sql.push(`(${options.precision}, ${options.scale})`)
  if (options.collate) sql.push('COLLATE', options.collate)
  if (options.using) sql.push('USING', options.using)
  return sql.join(' ')
}
