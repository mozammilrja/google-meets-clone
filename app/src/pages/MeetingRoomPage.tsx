import { useEffect } from 'react';
import { useMeeting, useToast } from '@/contexts';
import { VideoGrid, ActionBar, ChatPanel, ParticipantsPanel } from '@/components/meeting';
import { useWebRTC, useScreenShare } from '@/hooks';

export function MeetingRoomPage() {
  const {
    currentMeeting,
    isInMeeting,
    isHost,
    isAudioEnabled,
    isVideoEnabled,
    showChat,
    showParticipants,
    spotlightParticipant,
    chatMessages,
    toggleAudio,
    toggleVideo,
    toggleChat,
    toggleParticipantsPanel,
    sendMessage,
    leaveMeeting,
    endMeeting,
    raiseHand,
    lowerHand,
    sendReaction,
    setSpotlight,
    setLocalStream,
  } = useMeeting();

  const { success } = useToast();

  const { stream: localStream } = useWebRTC({
    enabled: isInMeeting,
    audioEnabled: isAudioEnabled,
    videoEnabled: isVideoEnabled,
  });

  const { stream: screenStream, isSharing, startShare, stopShare } = useScreenShare();

  useEffect(() => {
    if (localStream) {
      setLocalStream(localStream);
    }
  }, [localStream, setLocalStream]);

  const handleToggleScreenShare = async () => {
    if (isSharing) {
      stopShare();
    } else {
      await startShare();
    }
  };

  const handleLeaveMeeting = () => {
    if (isHost) {
      if (confirm('End meeting for everyone?')) {
        endMeeting();
        success('Meeting ended');
      }
    } else {
      leaveMeeting();
      success('Left meeting');
    }
  };

  const currentUserId = currentMeeting?.participants.find(p => p.name === 'You')?.id || '';
  const localParticipant = currentMeeting?.participants.find(p => p.name === 'You');
  const hasRaisedHand = localParticipant?.hasRaisedHand || false;
  const screenSharingParticipant = currentMeeting?.participants.find(p => p.isScreenSharing);

  if (!isInMeeting || !currentMeeting) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <VideoGrid
              participants={currentMeeting.participants}
              localStream={localStream}
              screenStream={screenStream}
              screenSharingParticipant={screenSharingParticipant || null}
              spotlightParticipant={spotlightParticipant}
              onSetSpotlight={setSpotlight}
              isScreenSharing={isSharing}
            />
          </div>
          <ActionBar
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isSharing}
            hasRaisedHand={hasRaisedHand}
            showChat={showChat}
            showParticipants={showParticipants}
            isHost={isHost}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={handleToggleScreenShare}
            onToggleChat={toggleChat}
            onToggleParticipants={toggleParticipantsPanel}
            onRaiseHand={raiseHand}
            onLowerHand={lowerHand}
            onLeaveMeeting={handleLeaveMeeting}
            onSendReaction={sendReaction}
            participantCount={currentMeeting.participants.length}
          />
        </div>

        {showChat && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendMessage}
            currentUserId={currentUserId}
            isOpen={showChat}
            onClose={toggleChat}
          />
        )}

        {showParticipants && (
          <ParticipantsPanel
            participants={currentMeeting.participants}
            currentUserId={currentUserId}
            isHost={isHost}
            isOpen={showParticipants}
            onClose={toggleParticipantsPanel}
          />
        )}
      </div>
    </div>
  );
}
