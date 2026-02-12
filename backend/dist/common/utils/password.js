"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const bcrypt = require("bcryptjs");
const SALT_ROUNDS = 10;
async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}
//# sourceMappingURL=password.js.map