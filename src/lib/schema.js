const Adapter = require('pg-adapter')
const CreateTable = require('./schema/createTable')
const ChangeTable = require('./schema/changeTable')
const {plural, singular} = require('pluralize')
const {noop} = require('./utils')

const createTable = (db, name, fn, options) =>
  new CreateTable(name, options).__commit(db, fn)

const dropTable = (db, name) =>
  db.exec(`DROP TABLE ${plural(name)} CASCADE`).catch(noop)

const createJoinTable = (db, tableOne, tableTwo, {tableName, columnOptions, ...options} = {}, cb) => {
  const name = tableName || [tableOne, tableTwo].sort().join('_')
  columnOptions = {type: 'integer', null: false, ...columnOptions}
  const fn = (t) => {
    t.belongsTo(tableOne, columnOptions)
    t.belongsTo(tableTwo, columnOptions)
    if (cb)
      cb(t)
  }
  createTable(db, name, fn, options)
}

const dropJoinTable = (db, tableOne, tableTwo, options, cb) => {
  dropTable(db, options.tableName || [tableOne, tableTwo].sort().join('_'), null, ...options)
}

module.exports = class Schema extends Adapter {
  constructor({reverse, ...params}) {
    super(params)
    this.reverse = reverse
  }

  createTable(name, options, fn) {
    if (this.reverse)
      return dropTable(this, name)

    if (typeof options === 'function') {
      fn = options
      options = {}
    }

    createTable(this, name, fn, options)
  }

  changeTable(name, options, fn) {
    if (typeof options === 'function') {
      fn = options
      options = {}
    }

    new ChangeTable(name, options).__commit(this, fn)
  }

  dropTable(name, options, fn) {
    if (this.reverse)
      return new CreateTable(name, options).__commit(this, fn)

    dropTable(this, name)
  }

  addBelongsTo(table, name, options) {
    this.changeTable(table, (t) => t.belongsTo(name, options))
  }

  addColumn(table, name, options) {
    this.changeTable(table, (t) => t.column(name, options))
  }

  addForeignKey(table, name, options) {
    this.changeTable(table, (t) => t.foreignKey(name, options))
  }

  addIndex(table, name, options) {
    this.changeTable(table, (t) => t.index(name, options))
  }

  addReference(table, name, options) {
    this.changeTable(table, (t) => t.reference(name, options))
  }

  addTimestamps(table, name, options) {
    this.changeTable(table, (t) => t.timestamps(name, options))
  }

  changeColumn(table, name, options) {
    this.changeTable(table, (t) => t.change(name, options))
  }

  changeColumnComment(table, column, comment) {
    this.changeTable(table, (t) => t.comment(column, comment))
  }

  changeColumnDefault(table, column, value) {
    this.changeTable(table, (t) => t.default(column, value))
  }

  changeColumnNull(table, column, value) {
    this.changeTable(table, (t) => t.null(column, value))
  }

  changeTableComment(table, comment) {
    this.changeTable(table, {comment})
  }

  columnExists(table, column) {
    const value = this.value(
      'SELECT 1 FROM information_schema.columns ' +
      `WHERE table_name = '${table}' AND column_name = '${column}'`
    )
    return this.reverse ? !value : value
  }

  createJoinTable(tableOne, tableTwo, options) {
    if (this.reverse)
      return dropJoinTable(this, tableOne, tableTwo, options)
    createJoinTable(this, tableOne, tableTwo, options)
  }

  dropJoinTable(tableOne, tableTwo, options) {
    if (this.reverse)
      return createJoinTable(this, tableOne, tableTwo, options)
    dropJoinTable(this, tableOne, tableTwo, options)
  }

  foreignKeyExists(fromTable, options) {
    let name
    if (typeof options === 'string')
      name = `${fromTable}_${singular(options)}_id_fkey`
    else
      name = options.name || `${fromTable}_${options.column}_fkey`

    const value = this.value(
      'SELECT 1 FROM information_schema.table_constraints ' +
      `WHERE constraint_name = '${name}'`
    )
    return this.reverse ? !value : value
  }

  tableExists(table) {
    const value = this.value(
      'SELECT FROM information_schema.tables ' +
      `WHERE table_name = '${table}'`
    )
    return this.reverse ? !value : value
  }
}
