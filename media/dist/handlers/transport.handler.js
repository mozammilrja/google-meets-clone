"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportHandler = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class TransportHandler {
    async createTransport(router, participantId, direction) {
        const transport = await router.createWebRtcTransport({
            listenIps: config_1.config.mediasoup.webRtcTransport.listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: config_1.config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
        });
        if (direction === 'recv') {
            await transport.setMaxIncomingBitrate(config_1.config.mediasoup.webRtcTransport.maxIncomingBitrate);
        }
        logger_1.logger.info({
            transportId: transport.id,
            participantId,
            direction,
            iceParameters: transport.iceParameters,
        }, 'WebRTC transport created');
        return transport;
    }
    async connectTransport(transport, dtlsParameters) {
        await transport.connect({ dtlsParameters });
        logger_1.logger.info({
            transportId: transport.id,
            iceState: transport.iceState,
            dtlsState: transport.dtlsState,
        }, 'Transport connected');
    }
    async getTransportStats(transport) {
        return await transport.getStats();
    }
    closeTransport(transport) {
        transport.close();
        logger_1.logger.info({ transportId: transport.id }, 'Transport closed');
    }
}
exports.TransportHandler = TransportHandler;
//# sourceMappingURL=transport.handler.js.map