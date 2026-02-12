import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebRTCOptions {
  enabled: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
}

interface UseWebRTCReturn {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  restartStream: () => Promise<void>;
  stopStream: () => void;
}

export function useWebRTC(options: UseWebRTCOptions): UseWebRTCReturn {
  const { enabled, audioEnabled = true, videoEnabled = true } = options;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const getMedia = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: audioEnabled,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access media devices';
      setError(errorMessage);
      console.error('WebRTC Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, audioEnabled, videoEnabled]);

  const stopStream = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const restartStream = useCallback(async (): Promise<void> => {
    stopStream();
    await getMedia();
  }, [stopStream, getMedia]);

  useEffect(() => {
    if (enabled) {
      getMedia();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [enabled, getMedia, stopStream]);

  // Update track enabled states when audio/video enabled changes
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled;
      });
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled;
      });
    }
  }, [audioEnabled, videoEnabled]);

  return {
    stream,
    error,
    isLoading,
    restartStream,
    stopStream,
  };
}

// Hook for screen sharing
interface UseScreenShareReturn {
  stream: MediaStream | null;
  isSharing: boolean;
  error: string | null;
  startShare: () => Promise<void>;
  stopShare: () => void;
}

export function useScreenShare(): UseScreenShareReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startShare = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Handle stream end (user clicks stop sharing)
      mediaStream.getVideoTracks()[0].onended = () => {
        stopShare();
      };

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsSharing(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start screen share';
      setError(errorMessage);
      console.error('Screen Share Error:', err);
    }
  }, []);

  const stopShare = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    setIsSharing(false);
  }, []);

  useEffect(() => {
    return () => {
      stopShare();
    };
  }, [stopShare]);

  return {
    stream,
    isSharing,
    error,
    startShare,
    stopShare,
  };
}

// Hook for checking media permissions
interface UseMediaPermissionsReturn {
  hasCamera: boolean;
  hasMicrophone: boolean;
  isChecking: boolean;
  checkPermissions: () => Promise<void>;
}

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = useCallback(async (): Promise<void> => {
    setIsChecking(true);

    try {
      // Check camera
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCamera(true);
        cameraStream.getTracks().forEach(track => track.stop());
      } catch {
        setHasCamera(false);
      }

      // Check microphone
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicrophone(true);
        micStream.getTracks().forEach(track => track.stop());
      } catch {
        setHasMicrophone(false);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    hasCamera,
    hasMicrophone,
    isChecking,
    checkPermissions,
  };
}
