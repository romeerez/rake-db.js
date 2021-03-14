import { ColumnChain, ReferencesChain } from 'types'

export const columnChain = (
  sql: string[],
  addingColumn: boolean,
): ColumnChain => {
  const chain: ColumnChain = {
    required() {
      if (addingColumn) sql.push('NOT NULL')
      return chain
    },
    default(value) {
      if (addingColumn) sql.push(`DEFAULT ${value}`)
      return chain
    },
    references(table: string, column?: string) {
      const refChain = referencesChain(sql, addingColumn)
      if (addingColumn) {
        sql.push(`REFERENCES "${table}"`)
        if (column) return refChain.column(column) as ReferencesChain
      }
      return refChain
    },
  }

  return chain
}

export const referencesChain = (
  sql: string[],
  addingColumn: boolean,
): ReferencesChain => {
  const chain: ReferencesChain = {
    column(column) {
      if (addingColumn) sql.push(`("${column}")`)
      return chain
    },
    onUpdate(action) {
      if (addingColumn) sql.push(`ON UPDATE ${action}`)
      return chain
    },
    onDelete(action) {
      if (addingColumn) sql.push(`ON DELETE ${action}`)
      return chain
    },
  }

  return chain
}
