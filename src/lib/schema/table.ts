import { quote } from 'pg-adapter'
import { addColumn, removeColumn } from './column'
import { reference, addForeignKey } from './foreignKey'
import timestamps from './timestamps'
import { noop } from '../utils'
import {
  Migration,
  AddIndexFunction,
  ColumnFunction,
  ColumnOptions,
  ForeignKeyOptions,
  IndexOptions,
  ReferenceOptions,
  TableOptions,
} from '../../types'

const reversableReference = (
  reverse: boolean,
  table: string,
  column: ColumnFunction,
  index: AddIndexFunction,
  name: string,
  options?: ReferenceOptions,
) => {
  if (reverse) reference(table, column, noop, name, options)
  else reference(table, column, index, name, options)
}

export default class Table {
  tableName: string
  reverse: boolean
  options: TableOptions
  lines: string[]
  indices: [boolean, string, undefined | true | IndexOptions][]
  comments: [string, string][]
  addColumnSql!: (sql: string) => void
  constraint!: (name: string, sql?: string) => void

  constructor(tableName: string, reverse: boolean, options: TableOptions = {}) {
    this.tableName = tableName
    this.reverse = reverse
    this.options = options
    this.lines = []
    this.indices = []
    this.comments = []
  }

  execute(sql: string) {
    this.lines.push(sql)
  }

  column: ColumnFunction = (name, type, options = {}) => {
    if (this.reverse) return this.execute(removeColumn(`"${name}"`))

    this.addColumnSql(addColumn(`"${name}"`, type, options))

    if (options.unique)
      if (options.index === true || !options.index)
        options.index = { unique: true }
      else options.index.unique = true

    if (options.index) this.index(name, options.index)

    if ('comment' in options)
      this.comments.push([name, options.comment as string])
  }

  index = (name: string, options?: true | IndexOptions) => {
    this.indices.push([!this.reverse, name, options])
  }

  timestamps = (options?: ColumnOptions) => timestamps(this.column, options)

  reference = (name: string, options?: ReferenceOptions) =>
    reversableReference(
      this.reverse,
      this.tableName,
      this.column,
      this.index,
      name,
      options,
    )

  belongsTo = (name: string, options?: ReferenceOptions) =>
    reversableReference(
      this.reverse,
      this.tableName,
      this.column,
      this.index,
      name,
      options,
    )

  foreignKey = (name: string, options?: ForeignKeyOptions) =>
    addForeignKey(this.tableName, this.constraint, this.index, name, options)

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
    this.column(name, 'bigint', options)
  }

  bigserial(name: string, options?: ColumnOptions) {
    this.column(name, 'bigserial', options)
  }

  boolean(name: string, options?: ColumnOptions) {
    this.column(name, 'boolean', options)
  }

  date(name: string, options?: ColumnOptions) {
    this.column(name, 'date', options)
  }

  decimal(name: string, options?: ColumnOptions) {
    this.column(name, 'decimal', options)
  }

  float(name: string, options?: ColumnOptions) {
    this.column(name, 'float8', options)
  }

  integer(name: string, options?: ColumnOptions) {
    this.column(name, 'integer', options)
  }

  text(name: string, options?: ColumnOptions) {
    this.column(name, 'text', options)
  }

  smallint(name: string, options?: ColumnOptions) {
    this.column(name, 'smallint', options)
  }

  smallserial(name: string, options?: ColumnOptions) {
    this.column(name, 'smallserial', options)
  }

  string(name: string, options?: ColumnOptions) {
    this.column(name, 'text', options)
  }

  time(name: string, options?: ColumnOptions) {
    this.column(name, 'time', options)
  }

  timestamp(name: string, options?: ColumnOptions) {
    this.column(name, 'timestamp', options)
  }

  timestamptz(name: string, options?: ColumnOptions) {
    this.column(name, 'timestamptz', options)
  }

  binary(name: string, options?: ColumnOptions) {
    this.column(name, 'bytea', options)
  }

  serial(name: string, options?: ColumnOptions) {
    this.column(name, 'serial', options)
  }

  json(name: string, options?: ColumnOptions) {
    this.column(name, 'jsonb', options)
  }
}
