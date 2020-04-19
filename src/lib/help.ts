export default () => console.log(
`Usage: rake-db [command] [arguments]

DATABASE_URL env variable should be provided or a config file

DATABASE_URL must have format postgres://user:password@host:port/database

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
  "production": { same as above },
  "camelCase": true // by default
}

Migration files will be generated into:
- DB_DIR_PATH env variable (absolute path)
- current_dir/db/migrate

Commands:
  init                    create empty directories and database.json
  create                  create all databases
  create-versions-table   fox existing empty database
  drop                    drop all databases
  g, generate             generate migration file
  migrate                 migrate all pending in all dbs
  rollback                rollback the last migrated in all dbs
  no or unknown           print this message
  
Generate arguments: (no camel case here for better readability)
- (required) first argument is migration name
  * create_*      template for create table
  * change_*      template for change table
  * add_*         template for add columns
  * remove_*      template for remove columns
  * drop_*        template for drop table

- other arguments considered as columns with types:
  create_table name:text createdAt:date
`)
