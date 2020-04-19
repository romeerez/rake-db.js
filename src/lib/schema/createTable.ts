import Table from './table'
import {addIndex} from './index'
import {noop} from '../utils'
import {Schema, TableCallback, TableOptions} from '../../types'

export class CreateTable extends Table {
  constructor(tableName: string, reverse: boolean, options: TableOptions = {}) {
    super(tableName, reverse, options)
    if (options.id !== false) {
      this.reverse = false
      this.serial('id', {primaryKey: true})
    }
  }

  addColumnSql = (sql: string) =>
    this.execute(sql)

  constraint = (name: string, sql?: string) =>
    this.execute(`CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`)

  __commit = (db: Schema, fn?: TableCallback) => {
    if (fn) fn(this)

    const sql = []
    sql.push(`CREATE TABLE "${this.tableName}" (`)
    sql.push(this.lines.length ? '\n  ' + this.lines.join(',\n  ') : '')
    sql.push('\n)')
    db.exec(sql.join('')).catch(noop)

    for (let args of this.indices) {
      const [create, name, options] = args
      if (create)
        db.exec(addIndex(this.tableName, name, options)).catch(noop)
    }

    this.addComments(db)
  }
}
