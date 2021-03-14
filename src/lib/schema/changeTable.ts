import Table from './table'
import typeSql from './typeSql'
import { addIndex, dropIndex } from './index'
import { addColumn, removeColumn } from './column'
import { noop } from '../utils'
import { Migration, ColumnOptions, IndexOptions, ForeignKey } from '../../types'
import { columnChain } from './chain'
import { foreignKey } from './foreignKey'

const addConstraint = (name: string, sql?: string) =>
  `ADD CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`

const removeConstraint = (name: string) => `DROP CONSTRAINT "${name}"`

export type ChangeTableCallback = (t: ChangeTable) => void

export class ChangeTable extends Table {
  addColumnSql = (sql: string) => {
    const query = [`ADD COLUMN ${sql}`]
    this.execute(query)
    return columnChain(query, !this.reverse)
  }

  constraint = (name: string, sql?: string) => {
    this.execute([
      this.reverse ? removeConstraint(name) : addConstraint(name, sql),
    ])
  }

  removeConstraint = (name: string, sql?: string) =>
    this.execute([
      this.reverse ? addConstraint(name, sql) : removeConstraint(name),
    ])

  dropTimestamps = (options?: ColumnOptions) => {
    this.reverse = !this.reverse
    this.timestamps(options)
    this.reverse = !this.reverse
  }

  alterColumn = (name: string, sql: string) =>
    this.execute([`ALTER COLUMN "${name}" ${sql}`])

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
    else if (options.index === false) this.dropIndex(name, options)
    if ('comment' in options && options.comment)
      this.comments.push([name, options.comment])

    this.reverse = reverse
  }

  rename = (from: string, to: string) => {
    const f = this.reverse ? to : from
    const t = this.reverse ? from : to
    this.execute([`RENAME COLUMN "${f}" TO "${t}"`])
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

  drop = (name: string, type: string, options?: ColumnOptions) => {
    if (this.reverse)
      return this.addColumnSql(addColumn(`"${name}"`, type, options))
    this.execute([removeColumn(`"${name}"`, type, options)])
  }

  dropIndex = (name: string | string[], options: true | IndexOptions = {}) =>
    this.indices.push([this.reverse, name, options])

  foreignKey: ForeignKey = (params) => {
    foreignKey('changeTable', this, this.reverse, params)
  }

  dropForeignKey: ForeignKey = (params) => {
    foreignKey('changeTable', this, !this.reverse, params)
  }

  __commit = (db: Migration, fn?: ChangeTableCallback) => {
    this.reverse = db.reverse

    if (fn) fn(this)

    if (this.lines.length) {
      let sql = `ALTER TABLE "${this.tableName}"`
      sql +=
        '\n' +
        this.lines
          .map((arr) => (Array.isArray(arr) ? arr.join(' ') : arr))
          .join(',\n')
      db.exec(sql).catch(noop)
    }

    for (const args of this.indices) {
      const [create, name, options] = args
      if (create) db.exec(addIndex(this.tableName, name, options)).catch(noop)
      else db.exec(dropIndex(this.tableName, name, options)).catch(noop)
    }

    this.addComments(db)
  }
}
