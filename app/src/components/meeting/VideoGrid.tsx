import type { Participant } from '@/types';
import { VideoTile, ScreenShareTile } from './VideoTile';

interface VideoGridProps {
  participants: Participant[];
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  screenSharingParticipant: Participant | null;
  spotlightParticipant: string | null;
  onSetSpotlight: (participantId: string | null) => void;
  isScreenSharing: boolean;
}

export function VideoGrid({
  participants,
  localStream,
  screenStream,
  screenSharingParticipant,
  spotlightParticipant,
  onSetSpotlight,
  isScreenSharing,
}: VideoGridProps) {
  // If someone is screen sharing, show screen share as main view
  if (isScreenSharing && screenStream && screenSharingParticipant) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        {/* Screen Share - Main View */}
        <div className="flex-1 min-h-0">
          <ScreenShareTile 
            stream={screenStream} 
            participantName={screenSharingParticipant.name} 
          />
        </div>
        
        {/* Participant Thumbnails */}
        <div className="flex h-24 gap-2 overflow-x-auto">
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className="flex-shrink-0 w-32"
            >
              <VideoTile
                participant={participant}
                stream={participant.id === participants.find(p => p.name === 'You')?.id ? localStream : null}
                isSpotlight={spotlightParticipant === participant.id}
                onClick={() => onSetSpotlight(participant.id)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate grid layout based on participant count
  const participantCount = participants.length;
  
  const getGridClass = () => {
    if (participantCount === 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2';
    if (participantCount <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (participantCount <= 9) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  };

  // If there's a spotlight participant, show them larger
  if (spotlightParticipant) {
    const spotlightParticipantData = participants.find(p => p.id === spotlightParticipant);
    const otherParticipants = participants.filter(p => p.id !== spotlightParticipant);

    if (spotlightParticipantData) {
      return (
        <div className="flex h-full flex-col md:flex-row gap-4 p-4">
          {/* Spotlight - Main View */}
          <div className="flex-1 min-h-0">
            <VideoTile
              participant={spotlightParticipantData}
              stream={localStream}
              isSpotlight={true}
              onClick={() => onSetSpotlight(null)}
              className="h-full"
            />
          </div>
          
          {/* Other Participants Sidebar */}
          {otherParticipants.length > 0 && (
            <div className="flex md:flex-col gap-2 h-24 md:h-auto md:w-48 overflow-x-auto md:overflow-y-auto">
              {otherParticipants.map((participant) => (
                <div 
                  key={participant.id}
                  className="flex-shrink-0 w-32 md:w-full aspect-video"
                >
                  <VideoTile
                    participant={participant}
                    stream={null}
                    onClick={() => onSetSpotlight(participant.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className={`grid ${getGridClass()} gap-4 p-4 h-full`}>
      {participants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          stream={participant.name === 'You' ? localStream : null}
          isLocal={participant.name === 'You'}
          onClick={() => onSetSpotlight(participant.id)}
          className="h-full min-h-[200px]"
        />
      ))}
    </div>
  );
}
