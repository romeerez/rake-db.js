import {
  ColumnOptions,
  IndexOptions,
  OnUpdateOrDeleteAction,
} from '../../types'
import { CreateTable } from './createTable'
import { ChangeTable } from './changeTable'

export class Column {
  constructor(
    public action: 'create' | 'add' | 'alter' | 'drop',
    public name: string,
    public options: ColumnOptions = {},
    public _type?: string,
  ) {}

  primaryKey() {
    this.options = { ...this.options, primaryKey: true }
    return this
  }

  type(type: string) {
    this.options = { ...this.options, type }
    return this
  }

  default(value: any) { // eslint-disable-line
    this.options = { ...this.options, default: value }
    return this
  }

  required() {
    this.options = { ...this.options, null: false }
    return this
  }

  optional() {
    this.options = { ...this.options, null: true }
    return this
  }

  index(options?: boolean | IndexOptions) {
    this.options = { ...this.options, index: options ?? true }
    return this
  }

  comment(comment: string) {
    this.options = { ...this.options, comment }
    return this
  }

  mode(mode: string) {
    this.options = { ...this.options, mode }
    return this
  }

  unique() {
    if (typeof this.options.index === 'object') {
      this.options = {
        ...this.options,
        index: { ...this.options.index, unique: true },
      }
    } else {
      this.options = { ...this.options, index: { unique: true } }
    }
    return this
  }

  length(length: number | string) {
    this.options = { ...this.options, length }
    return this
  }

  precision(precision: number | string) {
    this.options = { ...this.options, precision }
    return this
  }

  scale(scale: number | string) {
    this.options = { ...this.options, scale }
    return this
  }

  collate(collate: string) {
    this.options = { ...this.options, collate }
    return this
  }

  using(using: string) {
    this.options = { ...this.options, using }
    return this
  }

  references(table: string, column?: string) {
    this.options = { ...this.options, references: { table, column } }
    return this
  }

  column(column: string) {
    if (!this.options.references) {
      throw new Error('Please specify table for references')
    }
    this.options = {
      ...this.options,
      references: { ...this.options.references, column },
    }
    return this
  }

  onUpdate(action: OnUpdateOrDeleteAction) {
    if (!this.options.references) {
      throw new Error('Please specify table for references')
    }
    this.options = {
      ...this.options,
      references: { ...this.options.references, onUpdate: action },
    }
    return this
  }

  onDelete(action: OnUpdateOrDeleteAction) {
    if (!this.options.references) {
      throw new Error('Please specify table for references')
    }
    this.options = {
      ...this.options,
      references: { ...this.options.references, onDelete: action },
    }
    return this
  }

  toSql(table: CreateTable | ChangeTable): string | string[] {
    const { action, options, name } = this

    if (action === 'drop') {
      const sql = ['DROP COLUMN', `"${name}"`]
      let { mode } = options
      if (mode) {
        mode = mode.toUpperCase()
        sql.push(mode)
      } else {
        sql.push('CASCADE')
      }
      return sql.join(' ')
    }

    if ('comment' in options && options.comment)
      table.comments.push([name, options.comment])

    if (this.action === 'alter') {
      const sql: string[] = []

      if ((this.options.type && options.default) || options.default === null)
        this.alterColumn(sql, name, 'DROP DEFAULT')

      if (options.type)
        this.alterColumn(sql, name, `TYPE ${this.getTypeSql(options.type)}`)

      if (options.default !== undefined && options.default !== null)
        this.alterColumn(sql, name, `SET DEFAULT ${options.default}`)

      if (options.null !== undefined)
        this.alterColumn(
          sql,
          name,
          options.null ? 'DROP NOT NULL' : 'SET NOT NULL',
        )

      if (
        (!table.reverse && options.index) ||
        (table.reverse && options.index === false)
      ) {
        table.index(name, options.index || options)
      } else if (
        (!table.reverse && options.index === false) ||
        (table.reverse && options.index)
      ) {
        ;(table as ChangeTable).dropIndex(name, options.index || options)
      }

      return sql
    }

    const sql = [
      this.action === 'create' ? `"${name}"` : `ADD COLUMN "${name}"`,
    ]

    const type = options.type || this._type
    if (!type) throw new Error('Type is not specified')

    sql.push(this.getTypeSql(type))

    if (options.primaryKey) sql.push('PRIMARY KEY')

    if (options.null === false) sql.push('NOT NULL')

    if (options.default !== undefined) sql.push(`DEFAULT ${options.default}`)

    const { references } = options
    if (references) {
      sql.push(`REFERENCES "${references.table}"`)
      if (references.column) sql.push(`("${references.column}")`)

      if (references.onUpdate) sql.push(`ON UPDATE ${references.onUpdate}`)

      if (references.onDelete) sql.push(`ON DELETE ${references.onDelete}`)
    }

    if (options.unique) {
      if (options.index === true || !options.index)
        options.index = { unique: true }
      else options.index.unique = true
    }

    if (options.index) {
      table.index(name, options.index)
    }

    return sql.join(' ')
  }

  private alterColumn(arr: string[], name: string, sql: string) {
    arr.push(`ALTER COLUMN "${name}" ${sql}`)
  }

  private getTypeSql(type: string) {
    const { options } = this

    const sql = [type]

    if (options.length) sql.push(`(${options.length})`)
    else if (options.precision !== undefined && options.scale === undefined)
      sql.push(`(${options.precision})`)
    else if (options.precision === undefined && options.scale !== undefined)
      sql.push(`(${options.scale})`)
    else if (options.precision !== undefined && options.scale !== undefined)
      sql.push(`(${options.precision}, ${options.scale})`)

    if (options.collate) sql.push('COLLATE', options.collate)

    if (options.using) sql.push('USING', options.using)

    return sql.join(' ')
  }
}
