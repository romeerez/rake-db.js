"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
const versionsTable_1 = require("./versionsTable");
const pg_adapter_1 = require("pg-adapter");
const execCreateOrDrop = (utility, config, callback) => {
    if (config.url)
        config = pg_adapter_1.parseUrl(config.url);
    let command = utility;
    console.log(config);
    if (config.host)
        command += ' -h ' + config.host;
    if (config.port)
        command += ' -p ' + config.port;
    if (config.user)
        command += ' -U ' + config.user;
    command += ' ' + config.database;
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
