import Table from './table'
import { Column } from './column'
import { addIndex, dropIndex } from './index'
import { noop } from '../utils'
import {
  Migration,
  ColumnOptions,
  IndexOptions,
  ForeignKeyFunction,
  ColumnFunction,
} from '../../types'
import { ForeignKey } from './foreignKey'
import { PrimaryKey } from './primaryKey'

const addConstraint = (name: string, sql?: string) =>
  `ADD CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`

const removeConstraint = (name: string) => `DROP CONSTRAINT "${name}"`

export type ChangeTableCallback = (t: ChangeTable) => void

export class ChangeTable extends Table {
  constraint = (name: string, sql?: string) => {
    this.execute(
      this.reverse ? removeConstraint(name) : addConstraint(name, sql),
    )
  }

  removeConstraint = (name: string, sql?: string) =>
    this.execute(
      this.reverse ? addConstraint(name, sql) : removeConstraint(name),
    )

  dropTimestamps = (options?: ColumnOptions) => {
    this.reverse = !this.reverse
    this.timestamps(options)
    this.reverse = !this.reverse
  }

  column: ColumnFunction = (name, type, options = {}) => {
    if (this.reverse) {
      this.removedColumns.push(name)
      const column = new Column('drop', name, options, type)
      this.lines.push(column)
      return column
    }

    const column = new Column('add', name, options, type)
    this.lines.push(column)
    return column
  }

  change = (name: string, options?: ColumnOptions) => {
    const column = new Column('alter', name, options)
    this.lines.push(column)
    return column
  }

  rename = (from: string, to: string) => {
    const f = this.reverse ? to : from
    const t = this.reverse ? from : to
    this.execute(`RENAME COLUMN "${f}" TO "${t}"`)
  }

  comment = (column: string, message: string) => {
    this.comments.push([column, message])
  }

  default = (column: string, value: unknown) => {
    this.lines.push(new Column('alter', column, { default: value }))
  }

  null = (column: string, value: boolean) => {
    this.lines.push(new Column('alter', column, { null: value }))
  }

  drop = (name: string, type: string, options?: ColumnOptions) => {
    const column = new Column(
      this.reverse ? 'add' : 'drop',
      name,
      options,
      type,
    )
    this.lines.push(column)
    return column
  }

  dropIndex = (name: string | string[], options: true | IndexOptions = {}) =>
    this.indices.push([this.reverse, name, options])

  foreignKey: ForeignKeyFunction = (options) => {
    const fkey = new ForeignKey('changeTable', this, this.reverse, options)
    this.lines.push(fkey)
    return fkey
  }

  dropForeignKey: ForeignKeyFunction = (options) => {
    const fkey = new ForeignKey('changeTable', this, !this.reverse, options)
    this.lines.push(fkey)
    return fkey
  }

  primaryKey = (columns: string[], name?: string) => {
    const pkey = new PrimaryKey('add', columns, name)
    this.lines.push(pkey)
    return pkey
  }

  dropPrimaryKey = (columns: string[], name?: string) => {
    const pkey = new PrimaryKey('drop', columns, name)
    this.lines.push(pkey)
    return pkey
  }

  __commit = (db: Migration, fn?: ChangeTableCallback) => {
    this.reverse = db.reverse

    if (fn) fn(this)

    if (this.lines.length) {
      const lines: string[] = []
      this.lines.forEach((line) => {
        const item = typeof line === 'string' ? line : line.toSql(this)

        if (!item) return

        typeof item === 'string' ? lines.push(item) : lines.push(...item)
      })

      const sql = `ALTER TABLE "${this.tableName}"\n` + lines.join(',\n')
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
