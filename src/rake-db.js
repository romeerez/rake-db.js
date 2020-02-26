#!/usr/bin/env node

const args = process.argv.slice(2)
let firstArg = args.shift()
if (!firstArg)
  firstArg = 'help'

const commandArray = firstArg.split(':')
const command = commandArray[0]

if (command === 'create')
  require('./lib/createAndDrop').createDb(args)
else if (command === 'drop')
  require('./lib/createAndDrop').dropDb(args)
else if (command === 'generate' || command === 'g')
  require('./lib/generate').generate(args)
else if (command === 'migrate')
  require('./lib/migrate').migrate(args)
else if (command === 'rollback')
  require('./lib/migrate').rollback(args)
else if (command === 'help' || command === 'h')
  console.log(
`Usage: rake-db [command] [arguments]

Config file for databases could be found in:
- DB_CONFIG_PATH env variable (absolute path)
- current_dir/database.json
- current_dir/config/database.json

Config file should look like:
(environments keys and amount doesn't matter)
{
  "development": {
    "user": ...,
    "password": ...,
    "database": ...,
    ...other connection options
  },
  "test": { same as above },
  "production": { same as above }
}

Migration files will be generated into:
- DB_DIR_PATH env variable (absolute path)
- current_dir/db/migrate

Commands:
  create          create all databases
  drop            drop all databases
  g, generate     generate migration file
  migrate         migrate all pending in all dbs
  rollback        rollback the last migrated in all dbs
  h, help         print this message
  
Generate arguments:
- (required) first argument is migration name
  * create_*      template for create table
  * change_*      template for change table
  * add_*         template for add columns
  * remove_*      template for remove columns
  * drop_*        template for drop table

- other arguments considered as columns with types:
  create_table name:text created_at:date
`
  )
