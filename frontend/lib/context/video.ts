'use client'

import { create } from 'zustand'
import { VideoElement, VideoTrack, ConnectionInfo } from '@/lib/types'

interface VideoStore {
  // Video element refs
  videoElements: Map<string, VideoElement>
  videoTracks: Map<string, VideoTrack>
  
  // Remote streams from other participants
  remoteStreams: Map<string, MediaStream>
  
  // Connection state
  connectionStates: Map<string, ConnectionInfo>
  
  // Actions
  addVideoElement: (participantId: string, element: VideoElement) => void
  removeVideoElement: (participantId: string) => void
  addVideoTrack: (trackId: string, track: VideoTrack) => void
  removeVideoTrack: (trackId: string) => void
  setConnectionState: (participantId: string, state: ConnectionInfo) => void
  attachStreamToElement: (participantId: string, stream: MediaStream) => void
  updateTrack: (trackId: string, track: MediaStreamTrack) => void
  addRemoteStream: (participantId: string, stream: MediaStream) => void
  addTrackToRemoteStream: (participantId: string, track: MediaStreamTrack) => void
  removeRemoteStream: (participantId: string) => void
  getRemoteStream: (participantId: string) => MediaStream | undefined
  clear: () => void
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  videoElements: new Map(),
  videoTracks: new Map(),
  remoteStreams: new Map(),
  connectionStates: new Map(),

  addVideoElement: (participantId: string, element: VideoElement) =>
    set((state) => {
      const newElements = new Map(state.videoElements)
      newElements.set(participantId, element)
      return { videoElements: newElements }
    }),

  removeVideoElement: (participantId: string) =>
    set((state) => {
      const newElements = new Map(state.videoElements)
      newElements.delete(participantId)
      return { videoElements: newElements }
    }),

  addVideoTrack: (trackId: string, track: VideoTrack) =>
    set((state) => {
      const newTracks = new Map(state.videoTracks)
      newTracks.set(trackId, track)
      return { videoTracks: newTracks }
    }),

  removeVideoTrack: (trackId: string) =>
    set((state) => {
      const newTracks = new Map(state.videoTracks)
      newTracks.delete(trackId)
      return { videoTracks: newTracks }
    }),

  setConnectionState: (participantId: string, state: ConnectionInfo) =>
    set((prevState) => {
      const newStates = new Map(prevState.connectionStates)
      newStates.set(participantId, state)
      return { connectionStates: newStates }
    }),

  attachStreamToElement: (participantId: string, stream: MediaStream) => {
    const state = get()
    const videoElement = state.videoElements.get(participantId)
    if (videoElement?.element) {
      videoElement.element.srcObject = stream
      set((prevState) => {
        const newElements = new Map(prevState.videoElements)
        const updated = { ...videoElement, stream }
        newElements.set(participantId, updated)
        return { videoElements: newElements }
      })
    }
  },

  updateTrack: (trackId: string, track: MediaStreamTrack) =>
    set((state) => {
      const newTracks = new Map(state.videoTracks)
      const videoTrack = newTracks.get(trackId)
      if (videoTrack) {
        newTracks.set(trackId, { ...videoTrack, track })
      }
      return { videoTracks: newTracks }
    }),

  addRemoteStream: (participantId: string, stream: MediaStream) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams)
      const existingStream = newStreams.get(participantId)
      
      if (existingStream) {
        // Merge new tracks into existing stream
        stream.getTracks().forEach(track => {
          // Remove existing track of same kind if any
          existingStream.getTracks()
            .filter(t => t.kind === track.kind)
            .forEach(t => existingStream.removeTrack(t))
          existingStream.addTrack(track)
        })
        // Keep the same stream reference but trigger re-render
        newStreams.set(participantId, existingStream)
      } else {
        newStreams.set(participantId, stream)
      }
      
      return { remoteStreams: newStreams }
    }),

  addTrackToRemoteStream: (participantId: string, track: MediaStreamTrack) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams)
      let stream = newStreams.get(participantId)
      
      if (!stream) {
        stream = new MediaStream([track])
        newStreams.set(participantId, stream)
      } else {
        // Remove existing track of same kind
        stream.getTracks()
          .filter(t => t.kind === track.kind)
          .forEach(t => stream!.removeTrack(t))
        stream.addTrack(track)
      }
      
      return { remoteStreams: newStreams }
    }),

  removeRemoteStream: (participantId: string) =>
    set((state) => {
      const newStreams = new Map(state.remoteStreams)
      newStreams.delete(participantId)
      return { remoteStreams: newStreams }
    }),

  getRemoteStream: (participantId: string) => {
    return get().remoteStreams.get(participantId)
  },

  clear: () =>
    set({
      videoElements: new Map(),
      videoTracks: new Map(),
      remoteStreams: new Map(),
      connectionStates: new Map(),
    }),
}))
