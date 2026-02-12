import { mediaService } from './media'
import { transportsManager } from './transports'

export interface ProducerInfo {
  id: string
  kind: 'audio' | 'video' | 'screen'
  track?: MediaStreamTrack
  paused: boolean
}

class ProducersManager {
  private producers: Map<string, ProducerInfo> = new Map()
  private logger = console

  setSendTransport(_transport: any): void {
    // Transport reference stored in transportsManager, no need to duplicate
  }

  async createAudioProducer(stream: MediaStream): Promise<ProducerInfo> {
    try {
      const transport = transportsManager.getSendTransport()
      if (!transport) {
        throw new Error('Send transport not available')
      }

      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) {
        throw new Error('No audio track found in stream')
      }

      this.logger.log('[Producers] Creating audio producer...')

      const producer = await transport.produce({
        track: audioTrack,
        appData: { kind: 'audio' },
      })

      this.logger.log('[Producers] Audio producer created:', producer.id)

      const producerInfo: ProducerInfo = {
        id: producer.id,
        kind: 'audio',
        track: audioTrack,
        paused: false,
      }

      this.producers.set(producer.id, producerInfo)

      // Notify SFU about new producer
      await this.notifyProducer(producer.id, 'audio')

      return producerInfo
    } catch (error) {
      this.logger.error('[Producers] Failed to create audio producer:', error)
      throw error
    }
  }

  async createVideoProducer(stream: MediaStream): Promise<ProducerInfo> {
    try {
      const transport = transportsManager.getSendTransport()
      if (!transport) {
        throw new Error('Send transport not available')
      }

      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error('No video track found in stream')
      }

      this.logger.log('[Producers] Creating video producer...')

      const producer = await transport.produce({
        track: videoTrack,
        appData: { kind: 'video' },
      })

      this.logger.log('[Producers] Video producer created:', producer.id)

      const producerInfo: ProducerInfo = {
        id: producer.id,
        kind: 'video',
        track: videoTrack,
        paused: false,
      }

      this.producers.set(producer.id, producerInfo)

      // Notify SFU about new producer
      await this.notifyProducer(producer.id, 'video')

      return producerInfo
    } catch (error) {
      this.logger.error('[Producers] Failed to create video producer:', error)
      throw error
    }
  }

  async createScreenProducer(stream: MediaStream): Promise<ProducerInfo> {
    try {
      const transport = transportsManager.getSendTransport()
      if (!transport) {
        throw new Error('Send transport not available')
      }

      const videoTrack = stream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error('No video track found in stream')
      }

      this.logger.log('[Producers] Creating screen producer...')

      const producer = await transport.produce({
        track: videoTrack,
        appData: { kind: 'screen' },
      })

      this.logger.log('[Producers] Screen producer created:', producer.id)

      const producerInfo: ProducerInfo = {
        id: producer.id,
        kind: 'screen',
        track: videoTrack,
        paused: false,
      }

      this.producers.set(producer.id, producerInfo)

      // Notify SFU about new producer
      await this.notifyProducer(producer.id, 'screen')

      // Handle stop event
      videoTrack.onended = () => {
        this.logger.log('[Producers] Screen share stopped')
        this.closeProducer(producer.id)
      }

      return producerInfo
    } catch (error) {
      this.logger.error('[Producers] Failed to create screen producer:', error)
      throw error
    }
  }

  async pauseProducer(producerId: string): Promise<void> {
    try {
      const info = this.producers.get(producerId)
      if (!info) {
        throw new Error(`Producer ${producerId} not found`)
      }

      const transport = transportsManager.getSendTransport() as any
      if (!transport) {
        throw new Error('Send transport not available')
      }

      const producer = transport._producers?.find((p: any) => p.id === producerId)
      if (producer) {
        await producer.pause()
        info.paused = true
        this.logger.log('[Producers] Paused producer:', producerId)
      }
    } catch (error) {
      this.logger.error('[Producers] Failed to pause producer:', error)
      throw error
    }
  }

  async resumeProducer(producerId: string): Promise<void> {
    try {
      const info = this.producers.get(producerId)
      if (!info) {
        throw new Error(`Producer ${producerId} not found`)
      }

      const transport = transportsManager.getSendTransport() as any
      if (!transport) {
        throw new Error('Send transport not available')
      }

      const producer = transport._producers?.find((p: any) => p.id === producerId)
      if (producer) {
        await producer.resume()
        info.paused = false
        this.logger.log('[Producers] Resumed producer:', producerId)
      }
    } catch (error) {
      this.logger.error('[Producers] Failed to resume producer:', error)
      throw error
    }
  }

  async replaceTrack(producerId: string, newTrack: MediaStreamTrack): Promise<void> {
    try {
      const info = this.producers.get(producerId)
      if (!info) {
        throw new Error(`Producer ${producerId} not found`)
      }

      const transport = transportsManager.getSendTransport() as any
      if (!transport) {
        throw new Error('Send transport not available')
      }

      const producer = transport._producers?.find((p: any) => p.id === producerId)
      if (producer) {
        await producer.replaceTrack({ track: newTrack })
        info.track = newTrack
        this.logger.log('[Producers] Replaced track for producer:', producerId)
      }
    } catch (error) {
      this.logger.error('[Producers] Failed to replace track:', error)
      throw error
    }
  }

  closeProducer(producerId: string): void {
    try {
      const info = this.producers.get(producerId)
      if (!info) {
        return
      }

      const transport = transportsManager.getSendTransport() as any
      if (transport) {
        const producer = transport._producers?.find((p: any) => p.id === producerId)
        if (producer) {
          producer.close()
        }
      }

      // Stop the track
      if (info.track) {
        info.track.stop()
      }

      this.producers.delete(producerId)
      this.logger.log('[Producers] Closed producer:', producerId)
    } catch (error) {
      this.logger.error('[Producers] Failed to close producer:', error)
    }
  }

  closeAll(): void {
    this.producers.forEach((info) => {
      this.closeProducer(info.id)
    })
    this.producers.clear()
    this.logger.log('[Producers] Closed all producers')
  }

  getProducer(producerId: string): ProducerInfo | undefined {
    return this.producers.get(producerId)
  }

  getProducers(kind?: 'audio' | 'video' | 'screen'): ProducerInfo[] {
    const result: ProducerInfo[] = []
    this.producers.forEach((info) => {
      if (!kind || info.kind === kind) {
        result.push(info)
      }
    })
    return result
  }

  private async notifyProducer(
    producerId: string,
    kind: 'audio' | 'video' | 'screen'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = (mediaService as any).socket
      if (!socket) {
        reject(new Error('Not connected to media server'))
        return
      }
      socket.emit(
        'produce',
        { producerId, kind },
        (response: any) => {
          if (response.error) {
            reject(new Error(response.error))
          } else {
            this.logger.log('[Producers] SFU acknowledged producer:', producerId)
            resolve()
          }
        }
      )
    })
  }
}

export const producersManager = new ProducersManager()
