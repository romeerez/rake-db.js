"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../utils");
exports.default = (function (column, options) {
    if (options === void 0) { options = {}; }
    if (options.default === undefined)
        options.default = 'now()';
    column(utils_1.join('created', 'at'), 'timestamp', options);
    column(utils_1.join('updated', 'at'), 'timestamp', options);
});
