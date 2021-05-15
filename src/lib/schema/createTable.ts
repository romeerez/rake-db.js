import Table from './table'
import { addIndex } from './index'
import { noop } from '../utils'
import {
  ForeignKeyFunction,
  Migration,
  TableCallback,
  TableOptions,
} from '../../types'
import { ForeignKey } from './foreignKey'
import { PrimaryKey } from './primaryKey'

export class CreateTable extends Table {
  constructor(tableName: string, reverse: boolean, options: TableOptions = {}) {
    super(tableName, reverse, options)
    if (options.id !== false) {
      this.reverse = false
      this.serial('id', { primaryKey: true })
    }
  }

  foreignKey: ForeignKeyFunction = (options) => {
    const fkey = new ForeignKey('createTable', this, this.reverse, options)
    this.lines.push(fkey)
    return fkey
  }

  constraint = (name: string, sql?: string) =>
    this.execute(`CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`)

  primaryKey = (columns: string[], name?: string) => {
    const pkey = new PrimaryKey('create', columns, name)
    this.lines.push(pkey)
    return pkey
  }

  __commit = (db: Migration, fn?: TableCallback) => {
    if (fn) fn(this)

    const sql = []
    sql.push(`CREATE TABLE "${this.tableName}" (`)
    if (this.lines.length) {
      sql.push(
        '\n  ' +
          this.lines
            .map((item) => (typeof item === 'string' ? item : item.toSql(this)))
            .filter((string) => string)
            .join(',\n  '),
      )
    }
    sql.push('\n)')
    db.exec(sql.join('')).catch(noop)

    for (const args of this.indices) {
      const [create, column, options] = args
      if (create) db.exec(addIndex(this.tableName, column, options)).catch(noop)
    }

    this.addComments(db)
  }
}
