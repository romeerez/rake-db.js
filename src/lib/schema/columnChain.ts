import { ColumnChain } from 'types'

export const columnChain = (
  sql: string[],
  addingColumn: boolean,
): ColumnChain => {
  const chain = {
    required() {
      if (addingColumn) sql.push('NOT NULL')
      return chain
    },

    // eslint-disable-next-line
    default(value: any) {
      if (addingColumn) sql.push(`DEFAULT ${value}`)
      return chain
    },
  }

  return chain
}
