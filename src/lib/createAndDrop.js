const {exec} = require("child_process")
const {getConfig} = require('./utils')
const {createForConfig} = require('./versionsTable')

const execCreateOrDrop = (utility, config, callback) => {
  const command = utility + ' ' + config.database
  exec(command, async (error, stdout, stderr) => {
    if (stderr)
      console.error(stderr.trim())
    else {
      if (stdout.length)
        console.log(stdout)
      if (callback)
        await callback(config)
      const action = utility === 'createdb' ? 'created' : 'dropped'
      console.log(`Database ${config.database} was ${action} successfully`)
    }
  })
}

const createOrDrop = async (utility, callback) => {
  let config
  try {
    config = await getConfig()
  } catch (err) {
    return
  }
  for (let env in config)
    execCreateOrDrop(utility, config[env], callback)
}

const createDb = () =>
  createOrDrop('createdb', createForConfig)

const dropDb = (config) =>
  createOrDrop('dropdb')

module.exports = {
  createDb, dropDb
}
