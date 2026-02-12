import { mediaService } from './media'
import { transportsManager } from './transports'
import { useVideoStore } from '@/lib/context/video'

export interface ConsumerInfo {
  id: string
  producerId: string
  kind: 'audio' | 'video' | 'screen'
  track: MediaStreamTrack
  paused: boolean
  participantId: string
}

class ConsumersManager {
  private consumers: Map<string, ConsumerInfo> = new Map()
  private logger = console

  setRecvTransport(_transport: any): void {
    // Transport reference stored in transportsManager, no need to duplicate
  }

  async createConsumer(
    producerId: string,
    kind: 'audio' | 'video' | 'screen',
    participantId: string,
    rtpCapabilities: any
  ): Promise<ConsumerInfo> {
    try {
      const transport = transportsManager.getRecvTransport()
      if (!transport) {
        throw new Error('Recv transport not available')
      }

      this.logger.log(`[Consumers] Creating ${kind} consumer for producer ${producerId}...`)

      // Request consumer from SFU
      const consumerData = await new Promise<any>((resolve, reject) => {
        const socket = (mediaService as any).socket
        if (!socket) {
          reject(new Error('Not connected to media server'))
          return
        }
        socket.emit(
          'consume',
          { producerId, rtpCapabilities },
          (response: any) => {
            if (response.error) {
              reject(new Error(response.error))
            } else {
              resolve(response)
            }
          }
        )
      })

      // Create consumer
      const consumer = await transport.consume({
        id: consumerData.id,
        producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters,
        appData: consumerData.appData,
      })

      this.logger.log(`[Consumers] Created ${kind} consumer:`, consumer.id)

      const consumerInfo: ConsumerInfo = {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        track: consumer.track,
        paused: false,
        participantId,
      }

      this.consumers.set(consumer.id, consumerInfo)

      // Add track to video store
      const videoStore = useVideoStore.getState()
      videoStore.addVideoTrack(consumer.id, {
        id: consumer.id,
        participantId,
        kind: consumer.kind,
        track: consumer.track,
        enabled: true,
      })

      // Notify SFU that we're ready
      await this.resumeConsumer(consumer.id)

      return consumerInfo
    } catch (error) {
      this.logger.error(`[Consumers] Failed to create ${kind} consumer:`, error)
      throw error
    }
  }

  async pauseConsumer(consumerId: string): Promise<void> {
    try {
      const info = this.consumers.get(consumerId)
      if (!info) {
        throw new Error(`Consumer ${consumerId} not found`)
      }

      const transport = transportsManager.getRecvTransport() as any
      if (!transport) {
        throw new Error('Recv transport not available')
      }

      const consumer = transport._consumers?.find((c: any) => c.id === consumerId)
      if (consumer) {
        await consumer.pause()
        info.paused = true
        this.logger.log('[Consumers] Paused consumer:', consumerId)
      }
    } catch (error) {
      this.logger.error('[Consumers] Failed to pause consumer:', error)
      throw error
    }
  }

  async resumeConsumer(consumerId: string): Promise<void> {
    try {
      const info = this.consumers.get(consumerId)
      if (!info) {
        throw new Error(`Consumer ${consumerId} not found`)
      }

      const transport = transportsManager.getRecvTransport()
      if (!transport) {
        throw new Error('Recv transport not available')
      }

      if (!info.paused) {
        // Notify SFU
        return new Promise((resolve, reject) => {
          const socket = (mediaService as any).socket
          if (!socket) {
            reject(new Error('Not connected to media server'))
            return
          }
          socket.emit(
            'resumeConsumer',
            { consumerId },
            (response: any) => {
              if (response.error) {
                reject(new Error(response.error))
              } else {
                info.paused = false
                this.logger.log('[Consumers] Resumed consumer:', consumerId)
                resolve(undefined)
              }
            }
          )
        })
      }
    } catch (error) {
      this.logger.error('[Consumers] Failed to resume consumer:', error)
      throw error
    }
  }

  closeConsumer(consumerId: string): void {
    try {
      const info = this.consumers.get(consumerId)
      if (!info) {
        return
      }

      const transport = transportsManager.getRecvTransport() as any
      if (transport) {
        const consumer = transport._consumers?.find((c: any) => c.id === consumerId)
        if (consumer) {
          consumer.close()
        }
      }

      // Remove track from video store
      const videoStore = useVideoStore.getState()
      videoStore.removeVideoTrack(consumerId)

      this.consumers.delete(consumerId)
      this.logger.log('[Consumers] Closed consumer:', consumerId)
    } catch (error) {
      this.logger.error('[Consumers] Failed to close consumer:', error)
    }
  }

  closeAllByParticipant(participantId: string): void {
    const toClose: string[] = []
    this.consumers.forEach((info, consumerId) => {
      if (info.participantId === participantId) {
        toClose.push(consumerId)
      }
    })
    toClose.forEach((cId) => this.closeConsumer(cId))
    this.logger.log('[Consumers] Closed all consumers for participant:', participantId)
  }

  closeAll(): void {
    this.consumers.forEach((info) => {
      this.closeConsumer(info.id)
    })
    this.consumers.clear()
    this.logger.log('[Consumers] Closed all consumers')
  }

  getConsumer(consumerId: string): ConsumerInfo | undefined {
    return this.consumers.get(consumerId)
  }

  getConsumers(participantId?: string): ConsumerInfo[] {
    const result: ConsumerInfo[] = []
    this.consumers.forEach((info) => {
      if (!participantId || info.participantId === participantId) {
        result.push(info)
      }
    })
    return result
  }
}

export const consumersManager = new ConsumersManager()
