"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerManager = void 0;
const mediasoup = __importStar(require("mediasoup"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class WorkerManager {
    constructor() {
        this.workers = [];
        this.nextWorkerIdx = 0;
    }
    async createWorkers() {
        const { numWorkers, worker: workerSettings } = config_1.config.mediasoup;
        logger_1.logger.info(`Creating ${numWorkers} Mediasoup workers...`);
        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: workerSettings.logLevel,
                logTags: workerSettings.logTags,
                rtcMinPort: workerSettings.rtcMinPort,
                rtcMaxPort: workerSettings.rtcMaxPort,
            });
            worker.on('died', (error) => {
                logger_1.logger.error({ workerId: i, error }, 'Mediasoup worker died, exiting in 2s...');
                setTimeout(() => process.exit(1), 2000);
            });
            this.workers.push(worker);
            logger_1.logger.info({ workerId: i, pid: worker.pid }, `Mediasoup worker created`);
        }
        logger_1.logger.info('All Mediasoup workers created successfully');
    }
    getNextWorker() {
        const worker = this.workers[this.nextWorkerIdx];
        if (++this.nextWorkerIdx === this.workers.length) {
            this.nextWorkerIdx = 0;
        }
        return worker;
    }
    getWorkers() {
        return this.workers;
    }
    async closeAll() {
        logger_1.logger.info('Closing all Mediasoup workers...');
        for (const worker of this.workers) {
            worker.close();
        }
        this.workers = [];
        logger_1.logger.info('All Mediasoup workers closed');
    }
}
exports.WorkerManager = WorkerManager;
//# sourceMappingURL=worker-manager.js.map