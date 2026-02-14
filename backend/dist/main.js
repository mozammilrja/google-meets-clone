"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const graceful_shutdown_service_1 = require("./common/graceful-shutdown.service");
const logger = new common_1.Logger('Bootstrap');
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true,
        },
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.enableShutdownHooks();
    const shutdownService = app.get(graceful_shutdown_service_1.GracefulShutdownService);
    const port = process.env.PORT || 4000;
    await app.listen(port);
    logger.log(`Backend server listening on port ${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Redis signaling: ${process.env.ENABLE_REDIS_SIGNALING === 'true' ? 'enabled' : 'disabled'}`);
}
bootstrap().catch((error) => {
    logger.error('Failed to start backend server', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map