import {join} from '../utils'
import {ColumnFunction, ColumnOptions} from '../../types'

export default (column: ColumnFunction, options: ColumnOptions = {}) => {
  if (options.default === undefined) options.default = 'now()'
  column(join('created', 'at'), 'timestamp', options)
  column(join('updated', 'at'), 'timestamp', options)
}
