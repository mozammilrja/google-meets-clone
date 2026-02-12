import * as mediasoupClient from 'mediasoup-client'
import { RTCCapabilities } from '@/lib/types'

export interface Device {
  rtpCapabilities: RTCCapabilities
  canProduce: (kind: 'audio' | 'video') => boolean
  canConsume: () => boolean
}

class DeviceManager {
  private device: mediasoupClient.Device | null = null
  private logger = console

  async initialize(rtpCapabilities: RTCCapabilities): Promise<Device> {
    try {
      this.logger.log('[Device] Initializing with RTP capabilities')

      // Create device with mediasoup-client
      const device = new mediasoupClient.Device()

      // Load RTP capabilities
      await device.load({ routerRtpCapabilities: rtpCapabilities as any })

      this.logger.log('[Device] Initialized successfully')
      this.logger.log('[Device] Can produce audio:', device.canProduce('audio'))
      this.logger.log('[Device] Can produce video:', device.canProduce('video'))

      this.device = device

      return {
        rtpCapabilities: (device.rtpCapabilities as RTCCapabilities) || {},
        canProduce: (kind: 'audio' | 'video') => device.canProduce(kind),
        canConsume: () => true, // Mediasoup-client Device doesn't have canConsume method
      }
    } catch (error) {
      this.logger.error('[Device] Failed to initialize:', error)
      throw error
    }
  }

  getDevice(): mediasoupClient.Device | null {
    return this.device
  }

  getRtpCapabilities(): RTCCapabilities | null {
    if (!this.device) return null
    return this.device.rtpCapabilities as RTCCapabilities
  }

  canProduce(kind: 'audio' | 'video'): boolean {
    return this.device?.canProduce(kind) ?? false
  }

  canConsume(): boolean {
    return true // Mediasoup-client Device doesn't have canConsume method
  }

  reset(): void {
    this.device = null
    this.logger.log('[Device] Reset')
  }
}

export const deviceManager = new DeviceManager()
