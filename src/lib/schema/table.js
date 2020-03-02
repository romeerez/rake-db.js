const {addColumn, removeColumn} = require('./column')
const {reference, addForeignKey, removeForeignKey} = require('./foreignKey')
const timestamps = require('./timestamps')
const typeMap = require('./typeMap')
const {plural} = require('pluralize')
const {noop} = require('../utils')

const reversableReference = (reverse, table, column, index, name, options) => {
  if (reverse)
    reference(table, column, noop, name, options)
  else
    reference(table, column, index, name, options)
}

class Table {
  constructor(tableName, options = {}) {
    this.tableName = plural(tableName)
    this.options = options
    this.lines = []
    this.indices = []
    this.comments = []
  }

  execute(sql) {
    this.lines.push(sql)
  }

  column = (name, type, options = {}) => {
    if (this.reverse)
      return this.execute(removeColumn(`"${name}"`))

    this.addColumnSql(addColumn(`"${name}"`, type, options))

    if (options.unique)
      if (options.index === true || !options.index)
        options.index = {unique: true}
      else
        options.index.unique = true

    if (options.index)
      this.index(name, options.index)

    if (options.hasOwnProperty('comment'))
      this.comments.push([name, options.comment])
  }

  index = (name, options) => {
    this.indices.push([!this.reverse, name, options])
  }

  timestamps = (options) =>
    timestamps(this.column, options)

  reference = (name, options) =>
    reversableReference(
      this.reverse, this.tableName, this.column, this.index, name, options
    )

  belongsTo = (name, options) =>
    reversableReference(
      this.reverse, this.tableName, this.column, this.index, name, options
    )

  foreignKey = (name, options) =>
    addForeignKey(this.tableName, this.constraint, this.index, name, options)

  addComments = (db) => {
    if (this.reverse) return

    const {tableName, comments} = this
    if (this.options.hasOwnProperty('comment'))
      db.exec(`COMMENT ON TABLE "${tableName}" IS ${db.quote(this.options.comment)}`).catch(noop)
    for (let [column, message] of comments)
      db.exec(`COMMENT ON COLUMN "${tableName}"."${column}" IS ${db.quote(message)}`).catch(noop)
  }
}

const columnForType = (type) =>
  function(name, options) {
    this.column(name, type, options)
  }

for (let name in typeMap)
  Table.prototype[name] = columnForType(typeMap[name])

module.exports = Table
