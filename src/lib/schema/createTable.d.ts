import Table from './table';
import { Schema, TableCallback, TableOptions } from '../../types';
export declare class CreateTable extends Table {
    constructor(tableName: string, reverse: boolean, options?: TableOptions);
    addColumnSql: (sql: string) => void;
    constraint: (name: string, sql?: string | undefined) => void;
    __commit: (db: Schema, fn?: TableCallback | undefined) => void;
}
