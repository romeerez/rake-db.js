"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("./utils");
const migrationName = (args) => {
    const name = args[0];
    if (!name)
        utils_1.throwError('Please provide migration name');
    return name;
};
const migrateDirPath = async () => {
    const path = utils_1.dbMigratePath();
    try {
        fs.mkdirSync(path, { recursive: true });
    }
    catch (err) { }
    return path;
};
const generateFileContent = (name, args) => {
    const lines = ["import {Migration} from 'rake-db'\n\nexport const change = (db: Migration, up: boolean) => {"];
    let command = undefined;
    if (name.startsWith('create_'))
        command = 'create';
    else if (name.startsWith('change_'))
        command = 'change';
    else if (name.startsWith('add_'))
        command = 'add';
    else if (name.startsWith('remove_'))
        command = 'remove';
    else if (name.startsWith('drop_'))
        command = 'drop';
    if (command) {
        name = name.slice(command.length + 1);
        const hasColumns = command === 'drop' && args.find(arg => arg.indexOf(':') !== -1);
        if (command === 'create') {
            lines.push(`  db.createTable('${name}', (t) => {`);
        }
        else if (command === 'drop') {
            lines.push(`  db.dropTable(${name}${hasColumns ? '(t) => {' : ')'}`);
        }
        else {
            lines.push(`  db.changeTable('${name}', (t) => {`);
        }
        args.forEach(pair => {
            if (pair.indexOf(':') !== -1) {
                const [column, type] = pair.split(':');
                if (command === 'create' || command === 'add') {
                    lines.push(`    t.${type}('${column}')`);
                }
                else if (command === 'change') {
                    lines.push(`    t.change('${column}', up ? {type: '${type}'} : {?})`);
                }
                else if (command === 'remove') {
                    lines.push(`    t.remove('${column}', {type: '${type}'})`);
                }
            }
        });
        if (command === 'create')
            lines.push(`    t.timestamps()`);
        if (command !== 'drop' || hasColumns)
            lines.push(`  })`);
    }
    lines.push('}', '');
    return lines.join('\n');
};
const createMigrationFile = (name, content, dirPath) => {
    const now = new Date();
    const prefix = [
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
    ].map(value => value < 10 ? `0${value}` : value).join('');
    fs.writeFileSync(path.join(dirPath, `${prefix}_${name}.ts`), content);
};
exports.generate = async (args) => {
    const name = migrationName(args);
    const dirPath = await migrateDirPath();
    const content = generateFileContent(name, args.slice(1));
    await createMigrationFile(name, content, dirPath);
};
