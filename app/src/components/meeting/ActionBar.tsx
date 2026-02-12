import { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  MessageSquare,
  Users,
  Hand,
  PhoneOff,
  MoreVertical,
  Smile,
  Shield,
  Settings,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface ActionBarProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  hasRaisedHand: boolean;
  showChat: boolean;
  showParticipants: boolean;
  isHost: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  onLeaveMeeting: () => void;
  onSendReaction: (reaction: string) => void;
  participantCount: number;
  unreadMessageCount?: number;
}

const reactions = ['👍', '❤️', '😂', '😮', '🎉', '👏', '🔥', '💯'];

export function ActionBar({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  hasRaisedHand,
  showChat,
  showParticipants,
  isHost,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onRaiseHand,
  onLowerHand,
  onLeaveMeeting,
  onSendReaction,
  participantCount,
  unreadMessageCount = 0,
}: ActionBarProps) {
  const [showReactions, setShowReactions] = useState(false);

  const handleRaiseHand = () => {
    if (hasRaisedHand) {
      onLowerHand();
    } else {
      onRaiseHand();
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {/* Left - Meeting Info */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
          Meeting
        </span>
      </div>

      {/* Center - Main Controls */}
      <div className="flex items-center gap-2">
        {/* Microphone */}
        <Button
          variant={isAudioEnabled ? 'outline' : 'destructive'}
          size="icon"
          onClick={onToggleAudio}
          className="h-12 w-12 rounded-full"
          aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>

        {/* Camera */}
        <Button
          variant={isVideoEnabled ? 'outline' : 'destructive'}
          size="icon"
          onClick={onToggleVideo}
          className="h-12 w-12 rounded-full"
          aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>

        {/* Screen Share */}
        <Button
          variant={isScreenSharing ? 'default' : 'outline'}
          size="icon"
          onClick={onToggleScreenShare}
          className={`h-12 w-12 rounded-full ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <MonitorX className="h-5 w-5" />
          ) : (
            <MonitorUp className="h-5 w-5" />
          )}
        </Button>

        {/* Reactions */}
        <Popover open={showReactions} onOpenChange={setShowReactions}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              aria-label="Send reaction"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1">
              {reactions.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => {
                    onSendReaction(reaction);
                    setShowReactions(false);
                  }}
                  className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Raise Hand */}
        <Button
          variant={hasRaisedHand ? 'default' : 'outline'}
          size="icon"
          onClick={handleRaiseHand}
          className={`h-12 w-12 rounded-full ${hasRaisedHand ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
          aria-label={hasRaisedHand ? 'Lower hand' : 'Raise hand'}
        >
          <Hand className="h-5 w-5" />
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {isHost && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  Meeting Controls
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Leave Meeting */}
        <Button
          variant="destructive"
          size="icon"
          onClick={onLeaveMeeting}
          className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
          aria-label="Leave meeting"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Right - Secondary Controls */}
      <div className="flex items-center gap-2">
        {/* Chat */}
        <Button
          variant={showChat ? 'default' : 'outline'}
          size="icon"
          onClick={onToggleChat}
          className={`h-10 w-10 rounded-full relative ${showChat ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          aria-label="Toggle chat"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadMessageCount > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadMessageCount}
            </span>
          )}
        </Button>

        {/* Participants */}
        <Button
          variant={showParticipants ? 'default' : 'outline'}
          size="icon"
          onClick={onToggleParticipants}
          className={`h-10 w-10 rounded-full ${showParticipants ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          aria-label="Toggle participants"
        >
          <Users className="h-4 w-4" />
          <span className="ml-1 text-xs">{participantCount}</span>
        </Button>
      </div>
    </div>
  );
}
