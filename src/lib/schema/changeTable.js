const Table = require('./table')
const typeSql = require('./typeSql')
const {addIndex, removeIndex} = require('./index')
const {addColumn, removeColumn} = require('./column')
const {addForeignKey, removeForeignKey} = require('./foreignKey')
const {noop} = require('../utils')

const addConstraint = (name, sql) =>
  `ADD CONSTRAINT ${sql ? `"${name}" ${sql}` : name}`

const removeConstraint = (name) =>
  `DROP CONSTRAINT "${name}"`

module.exports = class ChangeTable extends Table {
  addColumnSql = (sql) =>
    this.execute(`ADD COLUMN ${sql}`)

  constraint = (name, sql) => {
    this.execute(this.reverse ? removeConstraint(name) : addConstraint(name, sql))
  }

  removeConstraint = (name, sql) =>
    this.execute(this.reverse ? addConstraint(name, sql) : removeConstraint(name))

  alterColumn = (name, sql) =>
    this.execute(`ALTER COLUMN ${name} ${sql}`)

  change = (name, options) => {
    const {reverse} = this
    this.reverse = false

    if (options.type && options.default || options.default === null)
      this.alterColumn(name, `DROP DEFAULT`)
    if (options.type)
      this.alterColumn(name, `TYPE ${typeSql(options.type, options)}`)
    if (options.default !== undefined)
      this.alterColumn(name, `SET DEFAULT ${options.default}`)
    if (options.null !== undefined)
      this.null(name, options.null)
    if (options.index)
      this.index(name, options.index)
    else if (options.index === false)
      this.removeIndex(name, options)
    if (options.hasOwnProperty('comment'))
      this.comments.push([name, options.comment])

    this.reverse = reverse
  }

  comment = (column, message) =>
    this.comments.push([column, message])

  default = (column, value) =>
    this.alterColumn(column, value === null ? 'DROP DEFAULT' : `SET DEFAULT ${value}`)

  null = (column, value) =>
    this.alterColumn(column, value ? 'DROP NOT NULL' : 'SET NOT NULL')

  remove = (name, type, options) => {
    if (this.reverse)
      return this.addColumnSql(addColumn(`"${name}"`, type, options))
    this.execute(removeColumn(`"${name}"`, type, options))
  }

  removeIndex = (name, options = {}) =>
    this.indices.push([this.reverse, name, options])

  removeForeignKey = (name, options) =>
    addForeignKey(this.tableName, this.removeConstraint, this.removeIndex, name, options)

  __commit = (db, fn) => {
    this.reverse = db.reverse

    if (fn)
      fn(this)

    if (this.lines.length) {
      let sql = `ALTER TABLE "${this.tableName}"`
      sql += '\n' + this.lines.join(',\n')
      db.exec(sql).catch(noop)
    }

    for (let args of this.indices) {
      const [create, name, options] = args
      if (create)
        db.exec(addIndex(this.tableName, name, options)).catch(noop)
      else
        db.exec(removeIndex(this.tableName, name, options)).catch(noop)
    }

    this.addComments(db)
  }
}
