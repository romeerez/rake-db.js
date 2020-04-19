"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const versionsTable_1 = require("./versionsTable");
const execCreateOrDrop = (utility, config, callback) => {
    const command = utility + ' ' + config.database;
    child_process_1.exec(command, async (error, stdout, stderr) => {
        if (stderr)
            console.error(stderr.trim());
        else {
            if (stdout.length)
                console.log(stdout);
            if (callback)
                await callback(config);
            const action = utility === 'createdb' ? 'created' : 'dropped';
            console.log(`Database ${config.database} was ${action} successfully`);
        }
    });
};
const createOrDrop = async (utility, callback) => {
    let config;
    config = await utils_1.getConfig();
    for (let env in config)
        execCreateOrDrop(utility, config[env], callback);
};
exports.createDb = () => createOrDrop('createdb', versionsTable_1.createForConfig);
exports.dropDb = () => createOrDrop('dropdb');
