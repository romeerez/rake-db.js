import { plural, singular } from 'pluralize'
import { join } from '../utils'
import {
  AddIndexFunction,
  ConstraintFunction,
  ForeignKeyOptions,
  IndexOptions,
  ReferenceOptions,
  IndexOnCallback,
  ColumnFunction,
  ColumnOptions,
} from '../../types'

const changeIndex = (
  table: string,
  addIndex: AddIndexFunction,
  name: string,
  index: true | IndexOptions,
) => {
  if (index === true) index = {}
  addIndex(join(name, 'id'), index)
}

export const references = ({
  toTable,
  primaryKey = 'id',
  onDelete,
  onUpdate,
}: ForeignKeyOptions) => {
  const sql = []
  sql.push('REFERENCES', `"${toTable}"`, `("${primaryKey}")`)
  if (onDelete) {
    const value = IndexOnCallback[onDelete]
    if (value) sql.push('ON DELETE', value)
  }
  if (onUpdate) {
    const value = IndexOnCallback[onUpdate]
    if (value) sql.push('ON UPDATE', value)
  }
  return sql.join(' ')
}

export const reference = (
  table: string,
  column: ColumnFunction,
  addIndex: AddIndexFunction,
  name: string,
  { type = 'integer', ...options }: ReferenceOptions = {},
) => {
  table = plural(table)
  name = singular(name)

  if (options.foreignKey === true) options = { ...options, foreignKey: {} }
  if (typeof options.foreignKey === 'string')
    options = { ...options, foreignKey: { column: options.foreignKey } }
  if (typeof options.foreignKey === 'object')
    if (!options.foreignKey.toTable)
      options = {
        ...options,
        foreignKey: { ...options.foreignKey, toTable: plural(name) },
      }

  if (typeof options !== 'object')
    throw new Error(`Unexpected reference options: ${JSON.stringify(options)}`)

  const { index, ...withoutIndexOptions } = options

  column(join(name, 'id'), type, withoutIndexOptions as ColumnOptions)

  if (index) changeIndex(table, addIndex, name, index)
}

const getConstraintName = (
  table: string,
  foreignKey: string | [string, string],
  options: ForeignKeyOptions,
) => {
  if (options.name) return options.name
  return join(table, foreignKey as string, 'fkey')
}

export const addForeignKey = (
  table: string,
  constraint: ConstraintFunction,
  addIndex: AddIndexFunction,
  name: string,
  options: ForeignKeyOptions = {},
) => {
  table = plural(table)
  name = singular(name)

  options = {
    toTable: plural(name),
    primaryKey: `id`,
    ...options,
  }

  let foreignKey: string | undefined = options.foreignKey as string | undefined
  if (!foreignKey) foreignKey = join(name, 'id')
  const sql = `FOREIGN KEY ("${foreignKey}") ${references(options)}`
  const constraintName = getConstraintName(table, foreignKey, options) as string
  constraint(constraintName, sql)

  if (options.index) changeIndex(table, addIndex, name, options.index)
}
