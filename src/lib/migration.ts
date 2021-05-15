import { Adapter, AdapterProps } from 'pg-adapter'
import { CreateTable } from './schema/createTable'
import { ChangeTable, ChangeTableCallback } from './schema/changeTable'
import { noop, join } from './utils'
import {
  TableOptions,
  JoinTableOptions,
  ColumnOptions,
  TableCallback,
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
  db.exec(`DROP TABLE "${name}" CASCADE`).catch(noop)

const renameTable = (db: Migration, from: string, to: string) =>
  db.exec(`ALTER TABLE "${from}" RENAME TO "${to}"`)

const createJoinTable = (
  db: Migration,
  tableOne: string,
  tableTwo: string,
  options?: JoinTableOptions | TableCallback,
  cb?: TableCallback,
) => {
  const {
    tableName,
    columnOptions,
    references = true,
    ...tableOptions
  } = (typeof options === 'object' ? options : {}) as JoinTableOptions

  if (tableOptions.id === undefined) tableOptions.id = false
  if (tableOptions.unique === undefined) tableOptions.unique = true

  const name = tableName || join(...[tableOne, tableTwo].sort())
  const col = { type: 'integer', null: false, ...columnOptions }
  const firstColumnName = join(tableOne, 'id')
  const secondColumnName = join(tableTwo, 'id')

  const fn = (t: CreateTable) => {
    let column = t.column(firstColumnName, col.type, col)
    if (references) column.references(tableOne, 'id')

    column = t.column(secondColumnName, col.type, col)
    if (references) column.references(tableTwo, 'id')

    if (tableOptions.unique)
      t.index([firstColumnName, secondColumnName], {
        name: `${name}_unique_index`,
        unique: true,
      })

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
    super({ ...params, pool: 1 })
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

  addColumn(
    table: string,
    name: string,
    type: string,
    options?: ColumnOptions,
  ) {
    this.changeTable(table, (t) => t.column(name, type, options))
  }

  addForeignKey(table: string, params: ForeignKeyOptions) {
    this.changeTable(table, (t) => t.foreignKey(params))
  }

  dropForeignKey(table: string, params: ForeignKeyOptions) {
    this.changeTable(table, (t) => t.dropForeignKey(params))
  }

  addPrimaryKey(table: string, columns: string[], name?: string) {
    this.changeTable(table, (t) => t.primaryKey(columns, name))
  }

  dropPrimaryKey(table: string, columns: string[], name?: string) {
    this.changeTable(table, (t) => t.dropPrimaryKey(columns, name))
  }

  addIndex(table: string, name: string, options?: IndexOptions) {
    this.changeTable(table, (t) => t.index(name, options))
  }

  dropIndex(table: string, name: string, options?: IndexOptions) {
    this.changeTable(table, (t) => t.dropIndex(name, options))
  }

  addTimestamps(table: string, options?: ColumnOptions) {
    this.changeTable(table, (t) => t.timestamps(options))
  }

  dropTimestamps(table: string, options?: ColumnOptions) {
    this.changeTable(table, (t) => t.dropTimestamps(options))
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

  renameColumn(table: string, from: string, to: string) {
    this.changeTable(table, (t) => t.rename(from, to))
  }

  dropColumn(
    table: string,
    name: string,
    type: string,
    options?: ColumnOptions,
  ) {
    this.changeTable(table, (t) => t.drop(name, type, options))
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
    if (this.reverse) {
      this.reverse = false
      createJoinTable(this, tableOne, tableTwo, options, cb)
      this.reverse = true
    }
    dropJoinTable(this, tableOne, tableTwo, options)
  }

  foreignKeyExists(
    fromTable: string,
    options: string | { name?: string; column: string },
  ) {
    let name
    if (typeof options === 'string')
      name = join(fromTable, options, 'id', 'fkey')
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
