"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerHandler = void 0;
const logger_1 = require("../utils/logger");
class ProducerHandler {
    constructor(recordingService) {
        this.recordingService = recordingService;
    }
    async createProducer(transport, kind, rtpParameters, participantId, roomId, userId, appData) {
        const producer = await transport.produce({
            kind,
            rtpParameters,
            appData: { participantId, roomId, userId, ...appData },
        });
        logger_1.logger.info({
            producerId: producer.id,
            participantId,
            kind,
            type: appData?.type || 'camera',
        }, 'Producer created');
        await this.recordingService.startRecording(producer.id, {
            roomId,
            participantId,
            userId,
            kind: appData?.type === 'screen' ? 'screen' : kind,
        });
        producer.on('transportclose', () => {
            logger_1.logger.info({ producerId: producer.id }, 'Producer transport closed');
            producer.close();
        });
        producer.on('score', (score) => {
            logger_1.logger.debug({ producerId: producer.id, score }, 'Producer score');
        });
        return producer;
    }
    async pauseProducer(producer) {
        await producer.pause();
        logger_1.logger.info({ producerId: producer.id }, 'Producer paused');
    }
    async resumeProducer(producer) {
        await producer.resume();
        logger_1.logger.info({ producerId: producer.id }, 'Producer resumed');
    }
    async closeProducer(producer) {
        await this.recordingService.stopRecording(producer.id);
        producer.close();
        logger_1.logger.info({ producerId: producer.id }, 'Producer closed');
    }
    async getProducerStats(producer) {
        return await producer.getStats();
    }
}
exports.ProducerHandler = ProducerHandler;
//# sourceMappingURL=producer.handler.js.map