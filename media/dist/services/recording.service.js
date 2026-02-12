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
exports.RecordingService = void 0;
const fs = __importStar(require("fs/promises"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class RecordingService {
    constructor() {
        this.activeRecordings = new Map();
    }
    async startRecording(producerId, metadata) {
        if (!config_1.config.recording.enabled) {
            logger_1.logger.debug('Recording is disabled, skipping');
            return;
        }
        const recording = {
            ...metadata,
            startedAt: new Date(),
        };
        this.activeRecordings.set(producerId, recording);
        logger_1.logger.info({
            producerId,
            roomId: metadata.roomId,
            participantId: metadata.participantId,
            kind: metadata.kind,
        }, 'Recording started (hook)');
    }
    async stopRecording(producerId) {
        const recording = this.activeRecordings.get(producerId);
        if (!recording) {
            return null;
        }
        recording.stoppedAt = new Date();
        this.activeRecordings.delete(producerId);
        logger_1.logger.info({
            producerId,
            roomId: recording.roomId,
            duration: recording.stoppedAt.getTime() - recording.startedAt.getTime(),
        }, 'Recording stopped (hook)');
        return recording;
    }
    getActiveRecordings(roomId) {
        return Array.from(this.activeRecordings.values()).filter((r) => r.roomId === roomId);
    }
    async stopRoomRecordings(roomId) {
        const producerIds = Array.from(this.activeRecordings.entries())
            .filter(([_, recording]) => recording.roomId === roomId)
            .map(([producerId]) => producerId);
        for (const producerId of producerIds) {
            await this.stopRecording(producerId);
        }
        logger_1.logger.info({ roomId, count: producerIds.length }, 'Stopped all room recordings');
    }
    async ensureRecordingDirectory() {
        if (!config_1.config.recording.enabled) {
            return;
        }
        try {
            await fs.mkdir(config_1.config.recording.path, { recursive: true });
            logger_1.logger.info({ path: config_1.config.recording.path }, 'Recording directory ready');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to create recording directory');
        }
    }
}
exports.RecordingService = RecordingService;
//# sourceMappingURL=recording.service.js.map