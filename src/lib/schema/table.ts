import { quote } from 'pg-adapter'
import { addColumn, removeColumn } from './column'
import timestamps from './timestamps'
import { noop } from '../utils'
import {
  Migration,
  ColumnFunction,
  ColumnOptions,
  IndexOptions,
  TableOptions,
  ColumnTypes,
  ColumnChain,
  ForeignKey,
} from '../../types'
import { columnChain } from './chain'
import { foreignKey } from './foreignKey'

type ColumnMethods = {
  [key in keyof typeof ColumnTypes]: (
    name: string,
    options?: ColumnOptions,
  ) => void
}

export default class Table implements ColumnMethods {
  tableName: string
  reverse: boolean
  options: TableOptions
  lines: (string | string[])[]
  indices: [boolean, string | string[], undefined | true | IndexOptions][]
  comments: [string, string][]
  addColumnSql!: (sql: string) => ColumnChain
  constraint!: (name: string, sql?: string) => void
  removedColumns: string[] = []

  constructor(tableName: string, reverse: boolean, options: TableOptions = {}) {
    this.tableName = tableName
    this.reverse = reverse
    this.options = options
    this.lines = []
    this.indices = []
    this.comments = []
  }

  execute(sql: string | string[]) {
    this.lines.push(sql)
  }

  column: ColumnFunction = (name, type, options = {}) => {
    if (this.reverse) {
      this.removedColumns.push(name)
      const sql = [removeColumn(`"${name}"`)]
      this.execute(sql)
      return columnChain(sql, false)
    }

    const chain = this.addColumnSql(addColumn(`"${name}"`, type, options))

    if (options.unique)
      if (options.index === true || !options.index)
        options.index = { unique: true }
      else options.index.unique = true

    if (options.index) this.index(name, options.index)

    if ('comment' in options)
      this.comments.push([name, options.comment as string])

    return chain
  }

  index = (column: string | string[], options?: true | IndexOptions) => {
    if (
      this.reverse &&
      (Array.isArray(column)
        ? column.some((col) => this.removedColumns.includes(col))
        : this.removedColumns.includes(column))
    )
      return
    this.indices.push([!this.reverse, column, options])
  }

  timestamps = (options?: ColumnOptions) => timestamps(this.column, options)

  foreignKey: ForeignKey = (params) => {
    foreignKey('createTable', this, this.reverse, params)
  }

  addComments = (db: Migration) => {
    if (this.reverse) return

    const { tableName, comments } = this
    if ('comment' in this.options)
      db.exec(
        `COMMENT ON TABLE "${tableName}" IS ${quote(this.options.comment)}`,
      ).catch(noop)
    for (const [column, message] of comments)
      db.exec(
        `COMMENT ON COLUMN "${tableName}"."${column}" IS ${quote(message)}`,
      ).catch(noop)
  }

  bigint(name: string, options?: ColumnOptions) {
    return this.column(name, 'bigint', options)
  }

  bigserial(name: string, options?: ColumnOptions) {
    return this.column(name, 'bigserial', options)
  }

  boolean(name: string, options?: ColumnOptions) {
    return this.column(name, 'boolean', options)
  }

  date(name: string, options?: ColumnOptions) {
    return this.column(name, 'date', options)
  }

  decimal(name: string, options?: ColumnOptions) {
    return this.column(name, 'decimal', options)
  }

  float(name: string, options?: ColumnOptions) {
    return this.column(name, 'float8', options)
  }

  integer(name: string, options?: ColumnOptions) {
    return this.column(name, 'integer', options)
  }

  text(name: string, options?: ColumnOptions) {
    return this.column(name, 'text', options)
  }

  smallint(name: string, options?: ColumnOptions) {
    return this.column(name, 'smallint', options)
  }

  smallserial(name: string, options?: ColumnOptions) {
    return this.column(name, 'smallserial', options)
  }

  string(name: string, options?: ColumnOptions) {
    return this.column(name, 'text', options)
  }

  time(name: string, options?: ColumnOptions) {
    return this.column(name, 'time', options)
  }

  timestamp(name: string, options?: ColumnOptions) {
    return this.column(name, 'timestamp', options)
  }

  timestamptz(name: string, options?: ColumnOptions) {
    return this.column(name, 'timestamptz', options)
  }

  binary(name: string, options?: ColumnOptions) {
    return this.column(name, 'bytea', options)
  }

  serial(name: string, options?: ColumnOptions) {
    return this.column(name, 'serial', options)
  }

  json(name: string, options?: ColumnOptions) {
    return this.column(name, 'json', options)
  }

  jsonb(name: string, options?: ColumnOptions) {
    return this.column(name, 'jsonb', options)
  }
}
