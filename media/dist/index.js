"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const server_1 = require("./server");
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
async function main() {
    try {
        logger_1.logger.info({
            port: config_1.config.http.port,
            jwtSecretConfigured: !!config_1.config.jwt.secret && config_1.config.jwt.secret !== 'your-secret-key',
            jwtSecretLength: config_1.config.jwt.secret?.length
        }, 'Starting ExitMeet Media Server with config...');
        const server = new server_1.MediaServer();
        await server.start();
        process.on('SIGINT', async () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully...');
            await server.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully...');
            await server.stop();
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to start media server');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map