import { useRef, useEffect } from 'react';
import { Mic, MicOff, VideoOff, Hand, Crown } from 'lucide-react';
import type { Participant } from '@/types';
import { getInitials, getAvatarColor } from '@/utils';

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isLocal?: boolean;
  isSpotlight?: boolean;
  onClick?: () => void;
  className?: string;
}

export function VideoTile({
  participant,
  stream,
  isLocal = false,
  isSpotlight = false,
  onClick,
  className = '',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = participant.isVideoEnabled && stream;
  const avatarColor = getAvatarColor(participant.name);

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl bg-gray-900 transition-all duration-300
        ${isSpotlight ? 'ring-4 ring-blue-500' : ''}
        ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-gray-400' : ''}
        ${className}
      `}
    >
      {/* Video or Avatar */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-800">
          {participant.avatar ? (
            <img
              src={participant.avatar}
              alt={participant.name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white ${avatarColor}`}
            >
              {getInitials(participant.name)}
            </div>
          )}
        </div>
      )}

      {/* Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate max-w-[120px]">
              {participant.name} {isLocal && '(You)'}
            </span>
            {participant.isHost && (
              <Crown className="h-4 w-4 text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {participant.hasRaisedHand && (
              <Hand className="h-4 w-4 text-yellow-400" />
            )}
            {participant.isAudioEnabled ? (
              <Mic className="h-4 w-4 text-white" />
            ) : (
              <MicOff className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Reaction Overlay */}
      {participant.reaction && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-bounce">
          <span className="text-6xl">{participant.reaction}</span>
        </div>
      )}

      {/* Connection Status */}
      {!participant.isVideoEnabled && !showVideo && (
        <div className="absolute top-2 right-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80">
            <VideoOff className="h-3 w-3 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

interface ScreenShareTileProps {
  stream: MediaStream;
  participantName: string;
}

export function ScreenShareTile({ stream, participantName }: ScreenShareTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gray-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-contain"
      />
      <div className="absolute top-4 left-4 rounded-lg bg-black/60 px-3 py-1.5">
        <span className="text-sm font-medium text-white">
          {participantName} is presenting
        </span>
      </div>
    </div>
  );
}
