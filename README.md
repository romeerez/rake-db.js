# rake-db

This is a migration tool which will be appreciated by people who get used to Ruby on Rails migrations.

It can create, drop, migrate and rollback database, it can generate migrations.
Currently that's all.

Also currently only postgres is supported.

Supporting other databases, schema file, plenty of features that `rake db` has requires contributions,
this library contain only basic minimum mentioned above.

## CLI

Execute command with `npx` or `yarn`

```
Usage: rake-db [command] [arguments]

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
```

## Versioning

After database is created via `rake-db create` there were appear table `schema_migrations`
for storing migrated versions.

Migrationg files are generated into `db/migrate` directory:

```
db/
  migrate/
    20200216005003_create_table.js
    20200223142823_change_table.js
```

After `rake-db migrate` that table `schema_migrations` will contain two versions,
after `rake-db rollback` one version will be deleted.

## Writing migration

Let's create table:

```bash
rake-db g create_entities name:text
```

It will create such migration file:
```js
exports.change = (db, up) => {
  db.createTable('entities', (t) => {
    t.text('name')
    t.timestamps()
  })
}
```

Here you can see db in the argument - it's instance of `pg-adapter` package with migration methods,
it means you can make queries.

Second argument `up` is boolean which is true for migrate and `false` for rollback.

```js
exports.change = (db, up) => {
  db.createTable('entities', (t) => {
    t.text('name')
    t.timestamps()
  })
  
  if (up) {
    const data = [ {name: 'one'}, {name: 'two'} ]
    db.exec(`INSERT INTO entities(name) VALUES ${
      data.map(row => `(${
        [row.name].map(db.quote).join(', ')
      })`).join(', ')
    }`)
  }
}
```

This will fill table with data only when migrating.

All database operations done in transaction so if query containing error it's not too bad,
table will not be created, you can fix error and run again.

## Migration directions

You can define `exports.up` for migrate, `exports.down` for rollback or `exports.change` for both.

## All methods and options

```js
exports.change = (db, up) => {
  // createTable will drop it on rollback
  db.createTable('table_name') // create table with single id column
  db.createTable('table_name', {id: false}) // don't create id column
  
  // comment is a db feature
  db.createTable('table_name', {comment: 'what is this table for', id: false}, (t) => { 
    t.column('column_name', {type: 'custom_type'}) // create column with custom type
    
    // Other column options:
    // if you want bigint id set id to false in createTable and use primaryKey: option
    t.bigserial('id', {primaryKey: true})
    t.date('some_required_timestamp', {
      null: false, // add NOT NULL constraint
      default: 'now()', // default accepts plain sql
      comment: 'what is this column for', // db comment for column
    })
    t.string('string', {default: db.quote('string')}) // to escape values
    
    t.integer('other_table_id', {
      index: true, // add simple index
      // index can accept options instead of true, all options see below:
      index: {unique: true, name: 'custom_index_name'},
      
      foreignKey: true, // add FOREIGN KEY constraint
      // foreignKey also can accept options, all options see below:
      foreignKey: {
        toTable: 'other_table_name'
      }
    })
    
    t.reference('table') // same as t.integer('table_id")
    
    // This will create:
    // - table_id integer, table_type text
    // - unique index including two columns
    // - foreignKey will be just ignored, it can't work here
    t.reference('table', {
      polymorphic: true,
      index: {unique: true},
      foreignKey: true
    })
    
    t.belongsTo('table') // alias to reference
    
    // All shortcuts for column of specific type:
    t.boolean(name, options) // true or false
    t.smallint(name, options) // integer -32768 .. +32767
    t.integer(name, options) // integer -2147483648 .. +2147483647
    t.bigint(name, options) // integer -9223372036854775808 .. 9223372036854775807
    t.smallserial(name, options) // auto incrementing smallint
    t.serial(name, options) // auto incrementing integer
    t.bigserial(name, options) // auto incrementing bigint
    t.date(name, options) // postgres date type
    t.decimal(name, options) // postgres decimal type aka numeric
    t.float(name, options) // postgres float8 type
    t.text(name, options) // just text
    t.string(name, options) // text alias
    t.time(name, options) // postgres time type
    t.timestamp(name, options) // timestamp without time zone
    t.timestamptz(name, options) // timstamp with time zone
    t.binary(name, options) // postgres bytea type
    
    // adds FOREIGN KEY for already defined column
    t.foreignKey('table', {
      primaryKey: 'id', // column related table, id is default
      primaryKey: ['id', 'type'], // for polymorphic
      foreignKey: 'table_id', // column in current table, [table]_id is default
      foreignKey: ['table_id', 'table_type'], // for polymorphic foreign key
      toTable: 'related_table_name', // for example, define author_id foreign key for table users
      index: true || {...options} // create index
    })
    
    t.index('single_column') // create index
    t.index(['column1', 'column2', 'column3']) // create index for multiple columns
    t.index('here_are_options', {
      unique: true, // UNIQUE constraint
      polymorphic: true, // will create index for (table_id, table_name) columns
      length: 20, // argument of column: CREATE INDEX ... ON table (column(20))
      order: 'asc' || 'desc', // order of index: CREATE INDEX ... ON table (column ASC)
      including: 'column' || ['column1', 'column2'], // allows to include columns for performance
      where: 'sql', // conditions
      tablespace: 'name', // advanced, see postgres docs for TABLESPASE
      with: 'string', // advanced, see postgres docs for WITH statement
    })
    
    t.execute('sql') // append custom sql into table definition query
    
    t.timestamps() // add created_at and updated_at, both with now() as default
  })
  
  // Will create one_table_second_table ( one_table_id integer, second_table_id integer )
  db.createJoinTable('one_table', 'second_table', {
    tableName: 'join_table_name', // by default sorted concatenation of table names
    columnOptions: options, // for both columns
    ...options, // options for createTable
  }, (t) => {
    // callback to define other columns
  })
  // for example:
  db.createJoinTable('songs', 'users', {tableName: 'favorite_songs', foreignKey: true})
  
  db.changeTable('table_name', {comment: 'comment will be updated, null for removing'}, (t) => {
    // for adding new columns all functions from createTable are available
    t.string('add_column') // add column on migrate, remove on rollback
    
    t.change('column', {
      type: 'new_type', // change column type
      null: true, // change NOT NULL constraint
      default: 'value', // change default
      index: true, // add index on migrate, remove on rollback
      comment: 'change column comment', // irreversible, but won't fail on rollback
    })
    
    t.comment('column', 'message') // change column comment
    t.default('column', 'value') // change column default
    t.null('column', true || false) // change column NOT NULL constraint
    
    t.remove('column', options) // remove column on migrate, add on rollback
    t.removeIndex('column', options) // remove index on migrate, add on rollback
    t.removeForeignKey('table_name', options) // remove on migrate, add on rollback
  })
  
  // drop table on migrate, create on rollback
  db.dropTable('table_name', options, (t) => {
    // definition of table
  })
  
  // for join table:
  db.dropJoinTable('first_table', 'second_table', options, (t) => {})
  
  // for options see similar functions above
  db.addBelongsTo('table', 'related_table', options)
  db.addColumn('table', 'name', options)
  db.addForeignKey('table', 'name', options)
  db.addIndex('table', 'name', options)
  db.addReference('table', 'name', options)
  db.addTimestamps('table', 'name', options)
  db.changeColumn('table', 'name', options)
  db.changeColumnComment('table', 'name', 'comment')
  db.changeColumnDefault('table', 'name', 'value')
  db.changeColumnNull('table', 'name', true || false)
  db.changeTableComment('table', 'comment')
  
  // I forgot to implement these two:
  db.renameTable('table', 'new_name')
  db.renameColumn('table', 'column', 'new_name')
  
  // check for db structure
  let bool = await db.columnExists('table', 'column')
  bool = await db.tableExists('table')
  bool = await db.foreignKeyExists('table', 'foreign_key_name') // name is table_column_fkey by default
}
```
