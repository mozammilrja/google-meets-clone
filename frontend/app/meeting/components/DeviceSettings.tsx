'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Settings, Mic, Video, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface MediaDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

interface DeviceSettingsProps {
  onDeviceChange?: (type: 'audio' | 'video' | 'speaker', deviceId: string) => void
}

export function DeviceSettings({ onDeviceChange }: DeviceSettingsProps) {
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([])
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([])
  
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('')
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('')
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('')
  
  const [audioLevel, setAudioLevel] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Enumerate devices on mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop())
          })
          .catch(() => {})

        const devices = await navigator.mediaDevices.enumerateDevices()
        
        setAudioInputs(devices.filter(d => d.kind === 'audioinput').map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        })))
        
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput').map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        })))
        
        setVideoInputs(devices.filter(d => d.kind === 'videoinput').map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
          kind: d.kind,
        })))
      } catch (error) {
        console.error('Failed to enumerate devices:', error)
      }
    }

    if (isOpen) {
      enumerateDevices()
    }
  }, [isOpen])

  // Preview video when dialog opens
  useEffect(() => {
    if (isOpen && selectedVideoInput) {
      startVideoPreview(selectedVideoInput)
    }
    return () => {
      stopPreview()
    }
  }, [isOpen, selectedVideoInput])

  // Monitor audio levels
  useEffect(() => {
    if (isOpen && selectedAudioInput) {
      startAudioMonitoring(selectedAudioInput)
    }
    return () => {
      stopAudioMonitoring()
    }
  }, [isOpen, selectedAudioInput])

  const startVideoPreview = async (deviceId: string) => {
    try {
      stopPreview()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      })
      previewStreamRef.current = stream
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to start video preview:', error)
    }
  }

  const stopPreview = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(track => track.stop())
      previewStreamRef.current = null
    }
  }

  const startAudioMonitoring = async (deviceId: string) => {
    try {
      stopAudioMonitoring()
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      })
      
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      const updateLevel = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255)
        requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (error) {
      console.error('Failed to start audio monitoring:', error)
    }
  }

  const stopAudioMonitoring = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
  }

  const handleAudioInputChange = (deviceId: string) => {
    setSelectedAudioInput(deviceId)
    onDeviceChange?.('audio', deviceId)
  }

  const handleAudioOutputChange = (deviceId: string) => {
    setSelectedAudioOutput(deviceId)
    onDeviceChange?.('speaker', deviceId)
  }

  const handleVideoInputChange = (deviceId: string) => {
    setSelectedVideoInput(deviceId)
    onDeviceChange?.('video', deviceId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your audio and video devices
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audio">
              <Mic className="mr-2 h-4 w-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video className="mr-2 h-4 w-4" />
              Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="space-y-4 py-4">
            {/* Microphone */}
            <div className="space-y-2">
              <Label htmlFor="microphone">Microphone</Label>
              <Select value={selectedAudioInput} onValueChange={handleAudioInputChange}>
                <SelectTrigger id="microphone">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioInputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Audio Level Meter */}
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-75"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Speaker */}
            <div className="space-y-2">
              <Label htmlFor="speaker">Speaker</Label>
              <Select value={selectedAudioOutput} onValueChange={handleAudioOutputChange}>
                <SelectTrigger id="speaker">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="w-full">
                <Volume2 className="mr-2 h-4 w-4" />
                Test Speaker
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-4 py-4">
            {/* Camera */}
            <div className="space-y-2">
              <Label htmlFor="camera">Camera</Label>
              <Select value={selectedVideoInput} onValueChange={handleVideoInputChange}>
                <SelectTrigger id="camera">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoInputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Video Preview */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!previewStreamRef.current && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  Select a camera to preview
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
