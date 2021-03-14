import Migration from './lib/migration'
import Table from './lib/schema/table'
import { Value } from 'pg-adapter/dist/lib/quote'

export { Migration, Table }

export type TableOptions = {
  id?: boolean
  comment?: string
}

export type JoinTableOptions = TableOptions & {
  tableName?: string
  columnOptions?: ColumnOptions
  options?: TableOptions
}

export type ColumnOptions = {
  primaryKey?: boolean
  type?: string
  default?: Value
  null?: boolean
  index?: boolean | IndexOptions
  comment?: string
  foreignKey?: ForeignKeyOptions
  mode?: string
  unique?: boolean
  length?: number | string
  precision?: number | string
  scale?: number | string
  collate?: string
  using?: string
  reference?: boolean
}

export type TableCallback = (t: Table) => void

export type ReferenceOptions = {
  type?: string
  foreignKey?: boolean | string | ForeignKeyOptions
  index?: boolean | IndexOptions
}

export type ForeignKeyOptions = {
  name?: string
  column?: string
  toTable?: string
  primaryKey?: string
  foreignKey?: string
  onUpdate?: keyof typeof IndexOnCallback
  onDelete?: keyof typeof IndexOnCallback
  index?: boolean | IndexOptions
}

export type IndexOptions = {
  name?: string
  unique?: boolean
  length?: number | string
  order?: string
  using?: string
  including?: string | string[]
  with?: string
  tablespace?: string
  where?: string
  mode?: string
}

export type AddIndexFunction = (
  name: string,
  options?: true | IndexOptions,
) => void

export type ColumnFunction = (
  name: string,
  type: string,
  options?: ColumnOptions,
) => ColumnChain

export type ConstraintFunction = (name: string, sql?: string) => void

export const ColumnTypes = {
  bigint: 'bigint',
  bigserial: 'bigserial',
  boolean: 'boolean',
  date: 'date',
  decimal: 'decimal',
  float: 'float8',
  integer: 'integer',
  text: 'text',
  smallint: 'smallint',
  smallserial: 'smallserial',
  string: 'text',
  time: 'time',
  timestamp: 'timestamp',
  timestamptz: 'timestamptz',
  binary: 'bytea',
  serial: 'serial',
  json: 'json',
  jsonb: 'jsonb',
} as const

export enum IndexOnCallback {
  noAction = 'NO ACTION',
  restrict = 'RESTRICT',
  cascade = 'CASCADE',
  setNull = 'SET NULL',
  nullify = 'SET NULL',
  setDefault = 'SET DEFAULT',
}

export type ColumnChain = {
  required(): ColumnChain
  // eslint-disable-next-line
  default(value: any): ColumnChain
}
