import { X, Mic, MicOff, Video, VideoOff, Crown, Hand, MoreVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Participant } from '@/types';
import { getInitials, getAvatarColor } from '@/utils';

interface ParticipantsPanelProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  isOpen: boolean;
  onClose: () => void;
  onToggleAudio?: (participantId: string) => void;
  onToggleVideo?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onMakeHost?: (participantId: string) => void;
}

export function ParticipantsPanel({
  participants,
  currentUserId,
  isHost,
  isOpen,
  onClose,
  onRemoveParticipant,
  onMakeHost,
}: ParticipantsPanelProps) {
  if (!isOpen) return null;

  const sortedParticipants = [...participants].sort((a, b) => {
    // Host first, then alphabetically
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex h-full w-80 flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            People
          </h3>
          <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
            {participants.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close participants panel"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Participants List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sortedParticipants.map((participant) => {
            const isCurrentUser = participant.id === currentUserId;
            const avatarColor = getAvatarColor(participant.name);

            return (
              <div
                key={participant.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {participant.avatar ? (
                      <img
                        src={participant.avatar}
                        alt={participant.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white ${avatarColor}`}
                      >
                        {getInitials(participant.name)}
                      </div>
                    )}
                    
                    {/* Status Indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-gray-900">
                      {participant.isAudioEnabled ? (
                        <Mic className="h-3 w-3 text-green-500" />
                      ) : (
                        <MicOff className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {participant.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-xs text-gray-500">(You)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.isHost && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                          <Crown className="h-3 w-3" />
                          Host
                        </span>
                      )}
                      {participant.hasRaisedHand && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                          <Hand className="h-3 w-3" />
                          Raised hand
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Audio/Video Status */}
                  <div className="flex items-center gap-1">
                    {participant.isVideoEnabled ? (
                      <Video className="h-4 w-4 text-gray-400" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-red-400" />
                    )}
                  </div>

                  {/* More Actions (for host) */}
                  {isHost && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Participant options"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onMakeHost?.(participant.id)}
                        >
                          Make host
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onRemoveParticipant?.(participant.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          Remove from meeting
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
