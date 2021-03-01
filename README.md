# rake-db

This is a migration tool for Postgres which is highly inspired by Ruby on Rails migrations, main features are:
- Nice syntax similar to RoR migrations
- It can automatically rollback migrations in common cases

Restrictions:
- Currently it supports only Typescript migrations
- Only Postgres is supported

Can create, drop, migrate and rollback database, and can generate migrations.

Has an option to generate names of columns, indices and foreign keys in camelCase.

## Get started

Add a script into `package.json`:
```json
{
  "scripts": {
    "db": "rake-db"
  }
}
```

And now commands become available (`npm run` command can be replaced with `yarn`):

```sh
npm run db init
npm run db g create_users name:text password:text
npm run db migrate
```

For quick start run:
```sh
npm run db init
```

It will ask you for configs and credentials, then it will create directory for migrations, will create or modify existing `.env` file, will create databases.

After completing you'll have such `.env` file, or put values manually:
```.env
# Required unless `DATABASES` set
DATABASE_URL=postgres://username:password@localhost:5432/db-name

# Optional: you can define any variables for multiple databases
DATABASE_URL_TEST=postgres://username:password@localhost:5432/db-name-test

# Optional: by default camel case is set to `false`
DATABASE_CAMEL_CASE=true

# Optional: by default is set to `migrations`
MIGRATIONS_PATH=migrations

# Optional unless `DATABASE_URL` is set, this defines a list of databases to migrate at once
DATABASES=DATABASE_URL,DATABASE_URL_TEST
```

If you specified multiple databases this command will migrate them all at once:
```sh
npm run db migrate
```

## Commands

Command | Description
--- | ---
init | creates migrations directory, sets up env config, creates databases
create | creates databases
drop | drops databases
g, generate | generates migration file, see below
migrate | migrate all pending migrations in all databases
rollback | rollback the last migrated in all databases
no or unknown | prints help

Generate arguments:
- (required) first argument is migration name
  * create_*      template for create table
  * change_*      template for change table
  * add_*         template for add columns
  * remove_*      template for remove columns
  * drop_*        template for drop table

- other arguments considered as columns with types:
```sh
npm run db g create_table name:text createdAt:date
```

## Versioning

`rake-db` is using special table `schemaMigrations` to store info about which migrations where applied, table will be created unless exists before running migration.

Migrations files are generated into `db/migrate` directory:

```
db/
  migrate/
    20200216005003_create_table.ts
    20200223142823_change_table.ts
```

## Writing migration

Let's create table:

```bash
npm run db g create_entities name:text
```

It will create such migration file:
```typescript
import { Migration } from 'rake-db'

export const change = (db: Migration, up: boolean) => {
  db.createTable('entities', (t) => {
    t.text('name')
    t.timestamps()
  })
}
```

`db` argument inherited from [pg-adapter](https://www.npmjs.com/package/pg-adapter) instance,
so it has all methods which `pg-adapter` library has, it can make queries.

Second argument `up` is boolean which is true for migrate and `false` for rollback.

```typescript
import { Migration } from 'rake-db'

export const change = (db: Migration, up: boolean) => {
  db.createTable('entities', (t) => {
    t.text('name')
    t.timestamps()
  })
  
  if (up) {
    const data = [{ name: 'one' }, { name: 'two' }]
    db.exec(`INSERT INTO entities(name) VALUES ${
      data.map(row => `(${
        [row.name].map(db.quote).join(', ')
      })`).join(', ')
    }`)
  }
}
```

This will fill table with data only when migrating up.

All migrations are running in transaction so if query contains error - not too bad,
table won't be created, you can fix error and run again.

## Migration directions

You can define `export const up` for migrate, `export const down` for rollback or `export const change` for both.

## All methods and options

```js
import { Migration } from 'rake-db'

export const change = async (db: Migration, up: boolean) => {
  // createTable will drop it on rollback
  db.createTable('table_name') // create table with single id column
  db.createTable('table_name', { id: false }) // don't create id column
  
  // comment is a database feature, this will create table with comment
  db.createTable('table_name', { comment: 'what is this table for', id: false }, (t) => { 
    t.column('column_name', { type: 'custom_type' }) // create column with custom type
    
    // Other column options:
    // if you want bigint id set id to false in createTable and use primaryKey: option
    t.bigserial('id', { primaryKey: true })
    t.date('some_required_timestamp', {
      null: false, // add NOT NULL constraint
      default: 'now()', // default accepts plain sql
      comment: 'what is this column for', // db comment for column
    })
    t.string('string', { default: db.quote('string') }) // to escape values
    
    t.integer('other_table_id', {
      index: true, // add simple index
      // index can accept options instead of true, all options see below:
      index: { unique: true, name: 'custom_index_name' },
      
      foreignKey: true, // add FOREIGN KEY constraint
      // foreignKey also can accept options, all options see below:
      foreignKey: {
        toTable: 'other_table_name'
      }
    })
    
    t.reference('table') // same as t.integer('table_id"), it doesn't put any restrictions! I guess I will have to change this behaviour
    
    // This will create:
    // - table_id bigint
    // - unique index
    // - a foreign key
    t.reference('table', {
      type: 'bigint',
      index: { unique: true },
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
    t.binary(name, options) // postgres bytea type
    t.json(name, options) // jsonB - not json! Because jsonb is what you want
    
    // adds FOREIGN KEY for already defined column
    t.foreignKey('table', {
      primaryKey: 'id', // column related table, id is default
      foreignKey: 'table_name', // column in current table, [table]_id is default
      toTable: 'related_table_name', // for example, define author_id foreign key for table users
      index: true || { ...options } // create index
    })
    
    // Index:
    t.index('single_column') // create index
    t.index(['column1', 'column2', 'column3']) // create index for multiple columns
    t.index('here_are_options', {
      unique: true, // UNIQUE constraint
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
    table_name: 'join_table_name', // by default sorted concatenation of table names
    columnOptions: options, // for both columns
    ...options, // options for createTable
  }, (t) => {
    // callback to define other columns
  })
  // for example:
  db.createJoinTable('songs', 'users', { table_name: 'favorite_songs', foreignKey: true })
  
  db.changeTable('table_name', { comment: 'comment will be updated, null for removing' }, (t) => {
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
  
  db.renameTable('current_name', 'new_name')
  
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
