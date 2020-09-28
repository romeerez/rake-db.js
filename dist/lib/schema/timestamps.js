"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.default = (column, options = {}) => {
    if (options.default === undefined)
        options.default = 'now()';
    column(utils_1.join('created', 'at'), 'timestamp', options);
    column(utils_1.join('updated', 'at'), 'timestamp', options);
};
