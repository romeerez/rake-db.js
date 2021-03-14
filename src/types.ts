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
  unique?: boolean
  references?: boolean
  columnOptions?: ColumnOptions
  options?: TableOptions
}

export type ForeignKeyOptions = {
  name?: string
  table: string
  column: string | string[]
  references: string | string[]
  onUpdate?: OnUpdateOrDeleteAction
  onDelete?: OnUpdateOrDeleteAction
  index?: true | IndexOptions
}

export type ForeignKey = (params: ForeignKeyOptions) => void

export type ColumnOptions = {
  primaryKey?: boolean
  type?: string
  default?: Value
  null?: boolean
  index?: boolean | IndexOptions
  comment?: string
  mode?: string
  unique?: boolean
  length?: number | string
  precision?: number | string
  scale?: number | string
  collate?: string
  using?: string
}

export type TableCallback = (t: Table) => void

export type IndexOptions = {
  name?: string
  unique?: boolean
  expression?: number | string
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

export enum OnCallback {
  noAction = 'NO ACTION',
  restrict = 'RESTRICT',
  cascade = 'CASCADE',
  setNull = 'SET NULL',
  nullify = 'SET NULL',
  setDefault = 'SET DEFAULT',
}

export type OnUpdateOrDeleteAction =
  | 'NO ACTION'
  | 'no action'
  | 'RESTRICT'
  | 'restrict'
  | 'CASCADE'
  | 'cascade'
  | 'SET NULL'
  | 'set null'
  | 'SET DEFAULT'
  | 'set default'

export type ColumnChain = {
  required(): ColumnChain
  // eslint-disable-next-line
  default(value: any): ColumnChain
  references(table: string): ReferencesChain
  references(
    table: string,
    column: string,
  ): Pick<ReferencesChain, 'onUpdate' | 'onDelete'>
}

export type ReferencesChain = {
  column(column: string): Pick<ReferencesChain, 'onUpdate' | 'onDelete'>
  onUpdate(action: OnUpdateOrDeleteAction): Pick<ReferencesChain, 'onDelete'>
  onDelete(action: OnUpdateOrDeleteAction): Pick<ReferencesChain, 'onUpdate'>
}
