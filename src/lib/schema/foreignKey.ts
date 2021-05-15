import { join } from '../utils'
import { ForeignKeyOptions } from '../../types'
import { CreateTable } from './createTable'
import { ChangeTable } from './changeTable'

export class ForeignKey {
  constructor(
    public action: 'createTable' | 'changeTable',
    public table: CreateTable | ChangeTable,
    public reverse: boolean,
    public options: ForeignKeyOptions,
  ) {}

  toSql(): undefined | string {
    const { action, table, reverse, options } = this

    if (action === 'createTable' && reverse) {
      return
    } else if (
      action === 'changeTable' &&
      reverse &&
      (Array.isArray(options.column)
        ? options.column.some((col) => table.removedColumns.includes(col))
        : table.removedColumns.includes(options.column))
    ) {
      return
    }

    const name =
      options.name ||
      (Array.isArray(options.column)
        ? join(table.tableName, ...(options.column as string[]), 'fkey')
        : join(table.tableName, options.column, 'fkey'))

    const columns = Array.isArray(options.column)
      ? options.column.map((col) => `"${col}"`).join(', ')
      : `"${options.column}"`

    const foreignColumns = Array.isArray(options.references)
      ? options.references.map((col) => `"${col}"`).join(', ')
      : `"${options.references}"`

    const onUpdate = options.onUpdate ? ` ON UPDATE ${options.onUpdate}` : ''
    const onDelete = options.onDelete ? ` ON DELETE ${options.onDelete}` : ''

    const prefix = action === 'createTable' ? '' : reverse ? 'DROP' : 'ADD'

    const sql = [prefix, `CONSTRAINT "${name}"`]

    if (action !== 'changeTable' || !reverse) {
      sql.push(
        `FOREIGN KEY (${columns}) REFERENCES "${options.table}"(${foreignColumns})${onUpdate}${onDelete}`,
      )
    }

    if (action === 'changeTable' && reverse) {
      sql.push('CASCADE')
    }

    if (options.index) {
      if (reverse !== table.reverse && (table as ChangeTable).dropIndex)
        (table as ChangeTable).dropIndex(options.column, options.index)
      else table.index(options.column, options.index)
    }

    return sql.join(' ')
  }
}
