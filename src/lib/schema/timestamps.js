module.exports = (column, options) => {
  if (options.default === undefined) options.default = 'now()'
  column('created_at', 'timestamp', options)
  column('updated_at', 'timestamp', options)
}
