import { CreateTable } from './createTable'
import { ChangeTable } from './changeTable'

export class PrimaryKey {
  constructor(
    public action: 'create' | 'add' | 'drop',
    public columns: string[],
    public name?: string,
  ) {}

  toSql(table: CreateTable | ChangeTable) {
    const { action, name } = this

    const drop =
      (!table.reverse && action === 'drop') ||
      (table.reverse && action === 'add')

    if (drop) {
      return `DROP CONSTRAINT "${name || `${table.tableName}_pkey`}"`
    }

    const columns = `(${this.columns
      .map((column) => `"${column}"`)
      .join(', ')})`

    const constraint = name ? `CONSTRAINT "${name}" ` : ''

    return `${
      action === 'create' ? '' : 'ADD '
    }${constraint}PRIMARY KEY ${columns}`
  }
}
