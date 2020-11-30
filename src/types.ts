import Migration from './lib/migration'
import Table from './lib/schema/table'
import { Value } from 'pg-adapter/dist/lib/quote'

export { Migration, Table }

export interface DbConfig {
  url?: string
  database?: string
  host?: string
  port?: number
  user?: string
  password?: string
}

export interface DbConfigs {
  [key: string]: DbConfig
}

export interface TableOptions {
  id?: boolean
  comment?: string
}

export interface JoinTableOptions extends TableOptions {
  tableName?: string
  columnOptions?: ColumnOptions
  options?: TableOptions
}

export interface ColumnOptions {
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

export interface ReferenceOptions {
  type?: string
  foreignKey?: boolean | string | ForeignKeyOptions
  index?: boolean | IndexOptions
}

export interface ForeignKeyOptions {
  name?: string
  column?: string
  toTable?: string
  primaryKey?: string
  foreignKey?: string
  onUpdate?: keyof typeof IndexOnCallback
  onDelete?: keyof typeof IndexOnCallback
  index?: boolean | IndexOptions
}

export interface IndexOptions {
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
) => void

export type ConstraintFunction = (name: string, sql?: string) => void

export enum ColumnTypes {
  bigint = 'bigint',
  bigserial = 'bigserial',
  boolean = 'boolean',
  date = 'date',
  decimal = 'decimal',
  float = 'float8',
  integer = 'integer',
  text = 'text',
  smallint = 'smallint',
  smallserial = 'smallserial',
  string = 'text',
  time = 'time',
  timestamp = 'timestamp',
  timestamptz = 'timestamptz',
  binary = 'bytea',
  serial = 'serial',
}

export enum IndexOnCallback {
  noAction = 'NO ACTION',
  restrict = 'RESTRICT',
  cascade = 'CASCADE',
  setNull = 'SET NULL',
  nullify = 'SET NULL',
  setDefault = 'SET DEFAULT',
}
