const {join} = require('../utils')

module.exports = (column, options = {}) => {
  if (options.default === undefined) options.default = 'now()'
  column(join('created', 'at'), 'timestamp', options)
  column(join('updated', 'at'), 'timestamp', options)
}
