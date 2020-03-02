const Table = require('./table')
const {addIndex} = require('./index')
const {noop} = require('../utils')

module.exports = class CreateTable extends Table {
  constructor(tableName, options = {}) {
    super(tableName, options)
    if (options.id !== false)
      this.serial('id', {primaryKey: true})
  }

  addColumnSql(sql) {
    this.execute(sql)
  }

  constraint = (name, sql) =>
    this.execute(`CONSTRAINT ${sql ? `${name} ${sql}` : name}`)

  __commit = (db, fn) => {
    if (fn) fn(this)

    const sql = []
    sql.push(`CREATE TABLE ${this.tableName} (`)
    sql.push(this.lines.length ? '\n  ' + this.lines.join(',\n  ') : '')
    sql.push('\n)')
    console.log(sql.join(''))
    process.exit()
    db.exec(sql.join('')).catch(noop)

    for (let args of this.indices) {
      const [create, name, options] = args
      if (create)
        db.exec(addIndex(this.tableName, name, options)).catch(noop)
    }

    this.addComments(db)
  }
}
