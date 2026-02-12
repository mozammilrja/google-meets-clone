"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const core_1 = require("@nestjs/core");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const app_module_1 = require("./app.module");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    try {
        logger_1.logger.info({
            port: 7000,
            jwtSecretConfigured: !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key',
        }, 'Starting ExitMeet Media Server...');
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.enableCors({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true,
        });
        app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
        await app.listen(7000);
        logger_1.logger.info({ port: 7000 }, 'Media server listening');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to start media server');
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map