import { ColumnOptions } from '../../types';
export declare const column: (name: string, type: string, options?: ColumnOptions) => string;
export declare const addColumn: (name: string, type: string, options?: ColumnOptions) => string;
export declare const removeColumn: (name: string, type?: string | ColumnOptions | undefined, options?: ColumnOptions) => string;
