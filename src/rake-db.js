#!/usr/bin/env node

const args = process.argv.slice(2)
let firstArg = args.shift()
if (!firstArg)
  firstArg = 'help'

const commandArray = firstArg.split(':')
const command = commandArray[0]

if (command === 'init')
  require('./lib/init')()
else if (command === 'create')
  require('./lib/createAndDrop').createDb(args)
else if (command === 'drop')
  require('./lib/createAndDrop').dropDb(args)
else if (command === 'generate' || command === 'g')
  require('./lib/generate').generate(args)
else if (command === 'migrate')
  require('./lib/migrate').migrate(args)
else if (command === 'rollback')
  require('./lib/migrate').rollback(args)
else if (command === 'create-versions-table')
  require('./lib/versionsTable').create()
else
  require('./lib/help')()
