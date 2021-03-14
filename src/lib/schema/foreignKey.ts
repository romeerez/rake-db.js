import { join } from '../utils'
import { ForeignKeyOptions, IndexOptions } from '../../types'

export const foreignKey = (
  operation: 'createTable' | 'changeTable',
  table: {
    tableName: string
    reverse: boolean
    removedColumns: string[]
    execute(sql: string[]): void
    index(column: string | string[], options: true | IndexOptions): void
    dropIndex?(column: string | string[], options: true | IndexOptions): void
  },
  reverse: boolean,
  params: ForeignKeyOptions,
) => {
  if (operation === 'createTable' && reverse) {
    return
  } else if (
    operation === 'changeTable' &&
    reverse &&
    (Array.isArray(params.column)
      ? params.column.some((col) => table.removedColumns.includes(col))
      : table.removedColumns.includes(params.column))
  ) {
    return
  }

  const name =
    params.name ||
    (Array.isArray(params.column)
      ? join(table.tableName, ...(params.column as string[]), 'fkey')
      : join(table.tableName, params.column, 'fkey'))

  const columns = Array.isArray(params.column)
    ? params.column.map((col) => `"${col}"`).join(', ')
    : `"${params.column}"`

  const foreignColumns = Array.isArray(params.references)
    ? params.references.map((col) => `"${col}"`).join(', ')
    : `"${params.references}"`

  const onUpdate = params.onUpdate ? ` ON UPDATE ${params.onUpdate}` : ''
  const onDelete = params.onDelete ? ` ON DELETE ${params.onDelete}` : ''

  const prefix = operation === 'createTable' ? '' : reverse ? 'DROP' : 'ADD'

  const sql = [prefix, `CONSTRAINT "${name}"`]

  if (operation !== 'changeTable' || !reverse) {
    sql.push(
      `FOREIGN KEY (${columns}) REFERENCES "${params.table}"(${foreignColumns})${onUpdate}${onDelete}`,
    )
  }

  if (operation === 'changeTable' && reverse) {
    sql.push('CASCADE')
  }

  table.execute([sql.join(' ')])

  if (params.index) {
    if (reverse !== table.reverse && table.dropIndex)
      table.dropIndex(params.column, params.index)
    else table.index(params.column, params.index)
  }
}
