"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerHandler = void 0;
const logger_1 = require("../utils/logger");
class ConsumerHandler {
    async createConsumer(transport, producer, rtpCapabilities, participantId) {
        const router = transport.appData.router;
        if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
            logger_1.logger.warn({
                producerId: producer.id,
                participantId,
            }, 'Cannot consume producer - incompatible capabilities');
            return null;
        }
        const consumer = await transport.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: true,
            appData: { participantId },
        });
        logger_1.logger.info({
            consumerId: consumer.id,
            producerId: producer.id,
            participantId,
            kind: consumer.kind,
        }, 'Consumer created');
        consumer.on('transportclose', () => {
            logger_1.logger.info({ consumerId: consumer.id }, 'Consumer transport closed');
            consumer.close();
        });
        consumer.on('producerclose', () => {
            logger_1.logger.info({ consumerId: consumer.id, producerId: producer.id }, 'Consumer producer closed');
            consumer.close();
        });
        consumer.on('producerpause', () => {
            logger_1.logger.debug({ consumerId: consumer.id }, 'Consumer producer paused');
        });
        consumer.on('producerresume', () => {
            logger_1.logger.debug({ consumerId: consumer.id }, 'Consumer producer resumed');
        });
        consumer.on('score', (score) => {
            logger_1.logger.debug({ consumerId: consumer.id, score }, 'Consumer score');
        });
        return consumer;
    }
    async resumeConsumer(consumer) {
        await consumer.resume();
        logger_1.logger.info({ consumerId: consumer.id }, 'Consumer resumed');
    }
    async pauseConsumer(consumer) {
        await consumer.pause();
        logger_1.logger.info({ consumerId: consumer.id }, 'Consumer paused');
    }
    async setConsumerLayers(consumer, spatialLayer, temporalLayer) {
        await consumer.setPreferredLayers({ spatialLayer, temporalLayer });
        logger_1.logger.info({ consumerId: consumer.id, spatialLayer, temporalLayer }, 'Consumer preferred layers set');
    }
    closeConsumer(consumer) {
        consumer.close();
        logger_1.logger.info({ consumerId: consumer.id }, 'Consumer closed');
    }
    async getConsumerStats(consumer) {
        return await consumer.getStats();
    }
}
exports.ConsumerHandler = ConsumerHandler;
//# sourceMappingURL=consumer.handler.js.map