import * as mediasoupClient from 'mediasoup-client'
import { mediaService } from './media'

export interface TransportInfo {
  transport: mediasoupClient.types.Transport
  direction: 'send' | 'recv'
  connected: boolean
}

class TransportsManager {
  private transports: Map<string, TransportInfo> = new Map()
  private logger = console

  /**
   * Create a WebRTC transport
   * IMPORTANT: Must call mediaService.joinRoom() before this
   */
  async createTransport(
    direction: 'send' | 'recv',
    device: mediasoupClient.Device
  ): Promise<TransportInfo> {
    try {
      // Verify we've joined a room first
      if (!mediaService.hasJoined()) {
        throw new Error('Must join room before creating transport. Call mediaService.joinRoom() first.')
      }

      this.logger.log(`[Transports] Creating ${direction} transport`)

      // Get transport options from SFU
      const transportOptions = await mediaService.createTransport(direction)

      if (!transportOptions.id) {
        throw new Error('No transport ID returned from server')
      }

      // Create the mediasoup-client transport
      let transport: mediasoupClient.types.Transport

      if (direction === 'send') {
        transport = device.createSendTransport({
          id: transportOptions.id!,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates || [],
          dtlsParameters: transportOptions.dtlsParameters,
        })
      } else {
        transport = device.createRecvTransport({
          id: transportOptions.id!,
          iceParameters: transportOptions.iceParameters,
          iceCandidates: transportOptions.iceCandidates || [],
          dtlsParameters: transportOptions.dtlsParameters,
        })
      }

      this.logger.log(`[Transports] Created ${direction} transport:`, transportOptions.id)

      // Handle transport connect event (DTLS)
      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          this.logger.log(`[Transports] Connecting ${direction} transport...`)
          await mediaService.connectTransport(transportOptions.id!, dtlsParameters)
          callback()
          this.logger.log(`[Transports] ${direction} transport connected`)
        } catch (error) {
          this.logger.error(`[Transports] Failed to connect ${direction} transport:`, error)
          errback(error as Error)
        }
      })

      // Handle produce event (only for send transport)
      if (direction === 'send') {
        transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
          try {
            this.logger.log(`[Transports] Producing ${kind}...`)
            const response = await mediaService.notifyProduce(
              transportOptions.id!,
              kind as 'audio' | 'video',
              rtpParameters,
              appData
            )
            callback({ id: response.producerId! })
            this.logger.log(`[Transports] Produced ${kind}:`, response.producerId)
          } catch (error) {
            this.logger.error(`[Transports] Failed to produce ${kind}:`, error)
            errback(error as Error)
          }
        })
      }

      // Handle connection state changes
      transport.on('connectionstatechange', (state: string) => {
        this.logger.log(`[Transports] ${direction} connection state:`, state)
        if (state === 'failed' || state === 'closed') {
          this.logger.error(`[Transports] ${direction} transport ${state}`)
        }
      })

      const transportInfo: TransportInfo = {
        transport,
        direction,
        connected: false, // Will become true after 'connect' event
      }

      this.transports.set(transportOptions.id, transportInfo)

      return transportInfo
    } catch (error) {
      this.logger.error(`[Transports] Failed to create ${direction} transport:`, error)
      throw error
    }
  }

  getTransport(dir: 'send' | 'recv'): mediasoupClient.types.Transport | null {
    for (const info of this.transports.values()) {
      if (info.direction === dir) {
        return info.transport
      }
    }
    return null
  }

  getSendTransport(): mediasoupClient.types.Transport | null {
    return this.getTransport('send')
  }

  getRecvTransport(): mediasoupClient.types.Transport | null {
    return this.getTransport('recv')
  }

  closeTransport(transportId: string): void {
    const info = this.transports.get(transportId)
    if (info) {
      info.transport.close()
      this.transports.delete(transportId)
      this.logger.log('[Transports] Closed transport:', transportId)
    }
  }

  closeAll(): void {
    this.transports.forEach((info, _id) => {
      try {
        info.transport.close()
      } catch (e) {
        // Ignore close errors
      }
    })
    this.transports.clear()
    this.logger.log('[Transports] Closed all transports')
  }
}

export const transportsManager = new TransportsManager()
