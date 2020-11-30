import { Adapter, AdapterProps } from 'pg-adapter'
import { CreateTable } from './schema/createTable'
import { ChangeTable, ChangeTableCallback } from './schema/changeTable'
import { plural, singular } from 'pluralize'
import { noop, join } from './utils'
import {
  Table,
  TableOptions,
  JoinTableOptions,
  ColumnOptions,
  TableCallback,
  ReferenceOptions,
  ForeignKeyOptions,
  IndexOptions,
} from '../types'

const createTable = (
  db: Migration,
  name: string,
  fn?: TableCallback,
  options?: TableOptions,
) => new CreateTable(name, db.reverse, options).__commit(db, fn)

const dropTable = (db: Migration, name: string) =>
  db.exec(`DROP TABLE "${plural(name)}" CASCADE`).catch(noop)

const renameTable = (db: Migration, from: string, to: string) =>
  db.exec(`ALTER TABLE "${plural(from)}" RENAME TO "${plural(to)}"`)

const createJoinTable = (
  db: Migration,
  tableOne: string,
  tableTwo: string,
  options?: JoinTableOptions | TableCallback,
  cb?: TableCallback,
) => {
  let tableName: string | undefined
  let columnOptions: ColumnOptions | undefined
  let tableOptions: TableOptions | undefined
  if (typeof options === 'object') {
    ;({ tableName, columnOptions, ...tableOptions } = options)
  }

  const name = tableName || join(...[tableOne, tableTwo].sort())
  columnOptions = { type: 'integer', null: false, ...columnOptions }
  const fn = (t: Table) => {
    t.belongsTo(tableOne, columnOptions)
    t.belongsTo(tableTwo, columnOptions)
    if (cb) cb(t)
  }
  return createTable(db, name, fn, tableOptions)
}

const dropJoinTable = (
  db: Migration,
  tableOne: string,
  tableTwo: string,
  options?: JoinTableOptions | TableCallback,
) => {
  const tableName = typeof options === 'object' ? options.tableName : undefined
  dropTable(db, tableName || join(...[tableOne, tableTwo].sort()))
}

export default class Migration extends Adapter {
  reverse: boolean

  constructor({ reverse, ...params }: AdapterProps & { reverse: boolean }) {
    super(params)
    this.reverse = reverse
  }

  createTable(
    name: string,
    options?: TableOptions | TableCallback,
    fn?: TableCallback,
  ) {
    if (this.reverse) return dropTable(this, name)

    if (typeof options === 'function') {
      fn = options as TableCallback
      options = {}
    }

    return createTable(this, name, fn as TableCallback, options)
  }

  changeTable(
    name: string,
    options?: TableOptions | ChangeTableCallback,
    fn?: ChangeTableCallback,
  ) {
    if (typeof options === 'function') {
      fn = options as ChangeTableCallback
      options = {}
    }

    return new ChangeTable(name, this.reverse, options).__commit(this, fn)
  }

  dropTable(
    name: string,
    options?: TableOptions | TableCallback,
    fn?: TableCallback,
  ) {
    if (this.reverse) {
      if (typeof options === 'function')
        return new CreateTable(name, this.reverse).__commit(this, options)
      else
        return new CreateTable(name, this.reverse, options).__commit(this, fn)
    }

    return dropTable(this, name)
  }

  renameTable(from: string, to: string) {
    if (this.reverse) renameTable(this, to, from)
    else renameTable(this, from, to)
  }

  addBelongsTo(table: string, name: string, options?: ReferenceOptions) {
    this.changeTable(table, (t) => t.belongsTo(name, options))
  }

  addColumn(
    table: string,
    name: string,
    type: string,
    options?: ColumnOptions,
  ) {
    this.changeTable(table, (t) => t.column(name, type, options))
  }

  addForeignKey(table: string, name: string, options?: ForeignKeyOptions) {
    this.changeTable(table, (t) => t.foreignKey(name, options))
  }

  addIndex(table: string, name: string, options?: IndexOptions) {
    this.changeTable(table, (t) => t.index(name, options))
  }

  addReference(table: string, name: string, options?: ReferenceOptions) {
    this.changeTable(table, (t) => t.reference(name, options))
  }

  addTimestamps(table: string, options?: ColumnOptions) {
    this.changeTable(table, (t) => t.timestamps(options))
  }

  changeColumn(table: string, name: string, options: ColumnOptions) {
    this.changeTable(table, (t) => t.change(name, options))
  }

  changeColumnComment(table: string, column: string, comment: string) {
    this.changeTable(table, (t) => t.comment(column, comment))
  }

  changeColumnDefault(table: string, column: string, value: unknown) {
    this.changeTable(table, (t) => t.default(column, value))
  }

  changeColumnNull(table: string, column: string, value: boolean) {
    this.changeTable(table, (t) => t.null(column, value))
  }

  changeTableComment(table: string, comment: string) {
    this.changeTable(table, { comment })
  }

  columnExists(table: string, column: string) {
    const value = this.value(
      'SELECT 1 FROM "information_schema"."columns" ' +
        `WHERE "table_name" = '${table}' AND "column_name" = '${column}'`,
    )
    return this.reverse ? !value : value
  }

  createJoinTable(
    tableOne: string,
    tableTwo: string,
    options?: JoinTableOptions | TableCallback,
    cb?: TableCallback,
  ) {
    if (this.reverse) return dropJoinTable(this, tableOne, tableTwo, options)
    createJoinTable(this, tableOne, tableTwo, options, cb)
  }

  dropJoinTable(
    tableOne: string,
    tableTwo: string,
    options?: JoinTableOptions | TableCallback,
    cb?: TableCallback,
  ) {
    if (this.reverse)
      return createJoinTable(this, tableOne, tableTwo, options, cb)
    dropJoinTable(this, tableOne, tableTwo, options)
  }

  foreignKeyExists(
    fromTable: string,
    options: string | { name?: string; column: string },
  ) {
    let name
    if (typeof options === 'string')
      name = join(fromTable, singular(options), 'id', 'fkey')
    else name = options.name || join(fromTable, options.column, 'fkey')

    const value = this.value(
      'SELECT 1 FROM "information_schema"."table_constraints" ' +
        `WHERE "constraint_name" = '${name}'`,
    )
    return this.reverse ? !value : value
  }

  tableExists(table: string) {
    const value = this.value(
      'SELECT FROM "information_schema"."tables" ' +
        `WHERE "table_name" = '${table}'`,
    )
    return this.reverse ? !value : value
  }
}
