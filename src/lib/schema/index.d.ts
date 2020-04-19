import { IndexOptions } from '../../types';
export declare const addIndex: (table: string, name: string, options?: true | IndexOptions) => string;
export declare const removeIndex: (table: string, name: string, options?: true | IndexOptions) => string;
