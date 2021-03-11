import Table from './table'
import typeSql from './typeSql'
import { addIndex, removeIndex } from './index'
import { addColumn, removeColumn } from './column'
import { addForeignKey } from './foreignKey'
import { noop } from '../utils'
import {
  Migration,
  ColumnOptions,
  ForeignKeyOptions,
  IndexOptions,
} from '../../types'

const addConstraint = (name: string, sql?: string) =>
  `ADD CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`

const removeConstraint = (name: string) => `DROP CONSTRAINT "${name}"`

export type ChangeTableCallback = (t: ChangeTable) => void

export class ChangeTable extends Table {
  addColumnSql = (sql: string) => this.execute(`ADD COLUMN ${sql}`)

  constraint = (name: string, sql?: string) => {
    this.execute(
      this.reverse ? removeConstraint(name) : addConstraint(name, sql),
    )
  }

  removeConstraint = (name: string, sql?: string) =>
    this.execute(
      this.reverse ? addConstraint(name, sql) : removeConstraint(name),
    )

  alterColumn = (name: string, sql: string) =>
    this.execute(`ALTER COLUMN "${name}" ${sql}`)

  change = (name: string, options: ColumnOptions) => {
    const { reverse } = this
    this.reverse = false

    if ((options.type && options.default) || options.default === null)
      this.alterColumn(name, `DROP DEFAULT`)
    if (options.type)
      this.alterColumn(name, `TYPE ${typeSql(options.type, options)}`)
    if (options.default !== undefined)
      this.alterColumn(name, `SET DEFAULT ${options.default}`)
    if (options.null !== undefined) this.null(name, options.null)
    if (options.index) this.index(name, options.index)
    else if (options.index === false) this.removeIndex(name, options)
    if ('comment' in options && options.comment)
      this.comments.push([name, options.comment])

    this.reverse = reverse
  }

  comment = (column: string, message: string) =>
    this.comments.push([column, message])

  default = (column: string, value: unknown) =>
    this.alterColumn(
      column,
      value === null ? 'DROP DEFAULT' : `SET DEFAULT ${value}`,
    )

  null = (column: string, value: boolean) =>
    this.alterColumn(column, value ? 'DROP NOT NULL' : 'SET NOT NULL')

  remove = (name: string, type: string, options?: ColumnOptions) => {
    if (this.reverse)
      return this.addColumnSql(addColumn(`"${name}"`, type, options))
    this.execute(removeColumn(`"${name}"`, type, options))
  }

  removeIndex = (name: string | string[], options: true | IndexOptions = {}) =>
    this.indices.push([this.reverse, name, options])

  removeForeignKey = (name: string, options: ForeignKeyOptions) =>
    addForeignKey(
      this.tableName,
      this.removeConstraint,
      this.removeIndex,
      name,
      options,
    )

  __commit = (db: Migration, fn?: ChangeTableCallback) => {
    this.reverse = db.reverse

    if (fn) fn(this)

    if (this.lines.length) {
      let sql = `ALTER TABLE "${this.tableName}"`
      sql += '\n' + this.lines.join(',\n')
      db.exec(sql).catch(noop)
    }

    for (const args of this.indices) {
      const [create, name, options] = args
      if (create) db.exec(addIndex(this.tableName, name, options)).catch(noop)
      else db.exec(removeIndex(this.tableName, name, options)).catch(noop)
    }

    this.addComments(db)
  }
}
