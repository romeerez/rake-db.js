export default () =>
  console.log(
    `Usage: rake-db [command] [arguments]

Commands:
  init                    creates migrations directory, sets up env config, creates databases
  create                  creates databases
  drop                    drops databases
  g, generate             generates migration file, see below
  migrate                 migrate all pending migrations in all databases
  rollback                rollback the last migrated in all databases
  no or unknown           prints this message
  
Generate arguments:
- (required) first argument is migration name
  * create_*      template for create table
  * change_*      template for change table
  * add_*         template for add columns
  * remove_*      template for remove columns
  * drop_*        template for drop table

- other arguments considered as columns with types:
  rake-db g create_table name:text createdAt:date
`,
  )
