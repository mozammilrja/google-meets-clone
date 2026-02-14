"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GracefulShutdownService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GracefulShutdownService = void 0;
const common_1 = require("@nestjs/common");
let GracefulShutdownService = GracefulShutdownService_1 = class GracefulShutdownService {
    constructor() {
        this.logger = new common_1.Logger(GracefulShutdownService_1.name);
        this.isShuttingDown = false;
        this.shutdownTimeout = 30000;
    }
    setSocketServer(server) {
        this.socketServer = server;
    }
    async onModuleDestroy() {
        this.logger.log('Module destroy initiated...');
        await this.performGracefulShutdown();
    }
    async onApplicationShutdown(signal) {
        this.logger.log(`Application shutdown signal received: ${signal}`);
        await this.performGracefulShutdown();
    }
    async performGracefulShutdown() {
        if (this.isShuttingDown) {
            this.logger.log('Shutdown already in progress...');
            return;
        }
        this.isShuttingDown = true;
        this.logger.log('Graceful shutdown initiated...');
        try {
            if (this.socketServer) {
                await this.closeSocketServer();
            }
            this.logger.log('Graceful shutdown complete');
        }
        catch (error) {
            this.logger.error('Error during graceful shutdown:', error);
        }
    }
    async closeSocketServer() {
        if (!this.socketServer)
            return;
        return new Promise((resolve) => {
            this.logger.log('Closing Socket.IO connections...');
            const sockets = this.socketServer.of('/signaling').sockets;
            const socketCount = sockets.size;
            this.logger.log(`Disconnecting ${socketCount} clients...`);
            this.socketServer.of('/signaling').emit('server-shutdown', {
                message: 'Server is shutting down for maintenance',
                reconnectAfter: 5000,
            });
            setTimeout(() => {
                this.socketServer.close(() => {
                    this.logger.log('Socket.IO server closed');
                    resolve();
                });
            }, 1000);
            setTimeout(() => {
                this.logger.warn('Socket.IO close timeout, forcing...');
                resolve();
            }, this.shutdownTimeout);
        });
    }
    isShutdownInProgress() {
        return this.isShuttingDown;
    }
};
exports.GracefulShutdownService = GracefulShutdownService;
exports.GracefulShutdownService = GracefulShutdownService = GracefulShutdownService_1 = __decorate([
    (0, common_1.Injectable)()
], GracefulShutdownService);
//# sourceMappingURL=graceful-shutdown.service.js.map