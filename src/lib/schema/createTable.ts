import Table from './table'
import { addIndex } from './index'
import { noop } from '../utils'
import { Migration, TableCallback, TableOptions } from '../../types'
import { columnChain } from './columnChain'

export class CreateTable extends Table {
  constructor(tableName: string, reverse: boolean, options: TableOptions = {}) {
    super(tableName, reverse, options)
    if (options.id !== false) {
      this.reverse = false
      this.serial('id', { primaryKey: true })
    }
  }

  addColumnSql = (sql: string) => {
    const query = [sql]
    this.execute(query)
    return columnChain(query, !this.reverse)
  }

  constraint = (name: string, sql?: string) =>
    this.execute([`CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`])

  __commit = (db: Migration, fn?: TableCallback) => {
    if (fn) fn(this)

    const sql = []
    sql.push(`CREATE TABLE "${this.tableName}" (`)
    sql.push(
      this.lines.length
        ? '\n  ' + this.lines.map((arr) => arr.join(' ')).join(',\n  ')
        : '',
    )
    sql.push('\n)')
    db.exec(sql.join('')).catch(noop)

    for (const args of this.indices) {
      const [create, column, options] = args
      if (create) db.exec(addIndex(this.tableName, column, options)).catch(noop)
    }

    this.addComments(db)
  }
}
