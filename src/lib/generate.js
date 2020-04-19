"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utils_1 = require("./utils");
const migrationName = (args) => {
    const name = args[0];
    if (!name)
        throw new Error('Please provide migration name');
    return name;
};
const migrateDirPath = async () => {
    const path = utils_1.dbMigratePath();
    try {
        fs_1.default.mkdirSync(path, { recursive: true });
    }
    catch (err) { }
    return path;
};
const generateFileContent = (name, args) => {
    const lines = ['exports.change = (db, up) => {'];
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
    fs_1.default.writeFileSync(path_1.default.join(dirPath, `${prefix}_${name}.js`), content);
};
exports.generate = async (args) => {
    const name = migrationName(args);
    const dirPath = await migrateDirPath();
    const content = generateFileContent(name, args.slice(1));
    await createMigrationFile(name, content, dirPath);
};
