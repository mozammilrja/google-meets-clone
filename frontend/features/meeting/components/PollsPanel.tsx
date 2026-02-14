'use client'

import React, { memo, useState, useCallback } from 'react'
import { X, Plus, BarChart3, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMeetingToolsStore, selectPolls, selectActivePoll, type Poll, type PollOption } from '../stores'
import { usePermissionsStore, selectIsHostOrCoHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'

interface PollsPanelProps {
  meetingId: string
  participantId: string
  participantName: string
  onClose: () => void
}

/**
 * Polls Panel - Create and manage polls
 */
export const PollsPanel = memo(function PollsPanel({
  meetingId,
  participantId,
  participantName,
  onClose,
}: PollsPanelProps) {
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  const polls = useMeetingToolsStore(selectPolls)
  const activePoll = useMeetingToolsStore(selectActivePoll)
  const createPoll = useMeetingToolsStore(state => state.createPoll)
  const votePoll = useMeetingToolsStore(state => state.votePoll)
  const closePoll = useMeetingToolsStore(state => state.closePoll)
  const deletePoll = useMeetingToolsStore(state => state.deletePoll)
  
  const [isCreating, setIsCreating] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  
  const handleAddOption = useCallback(() => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }, [options])
  
  const handleRemoveOption = useCallback((index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }, [options])
  
  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }, [options])
  
  const handleCreatePoll = useCallback(() => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return
    
    const poll = createPoll({
      meetingId,
      question: question.trim(),
      options: options
        .filter(o => o.trim())
        .map((text, i) => ({
          id: `opt-${i}`,
          text: text.trim(),
          votes: 0,
          voterIds: [],
        })),
      createdBy: participantId,
      createdByName: participantName,
      allowMultiple,
      isAnonymous,
    })
    
    // Broadcast to other participants
    signalingService.emit('poll-created', {
      meetingId,
      poll,
    })
    
    // Reset form
    setIsCreating(false)
    setQuestion('')
    setOptions(['', ''])
    setAllowMultiple(false)
    setIsAnonymous(false)
  }, [question, options, meetingId, participantId, participantName, allowMultiple, isAnonymous, createPoll])
  
  const handleVote = useCallback((pollId: string, optionId: string) => {
    votePoll(pollId, optionId, participantId)
    signalingService.emit('poll-vote', {
      meetingId,
      pollId,
      optionId,
      participantId,
    })
  }, [meetingId, participantId, votePoll])
  
  const handleClosePoll = useCallback((pollId: string) => {
    closePoll(pollId)
    signalingService.emit('poll-closed', { meetingId, pollId })
  }, [meetingId, closePoll])
  
  const handleDeletePoll = useCallback((pollId: string) => {
    deletePoll(pollId)
    signalingService.emit('poll-deleted', { meetingId, pollId })
  }, [meetingId, deletePoll])
  
  return (
    <aside 
      className={cn(
        "fixed right-4 top-4 bottom-24 w-[400px] z-40",
        "bg-[#202124] rounded-xl shadow-2xl",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-right-5 fade-in duration-200"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#8ab4f8]" />
          <h2 className="text-lg font-medium text-white">Polls</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Create Poll Button (Host/Co-host only) */}
        {isHostOrCoHost && !isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                       bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] 
                       rounded-full font-medium transition-colors mb-4"
          >
            <Plus className="h-5 w-5" />
            Create poll
          </button>
        )}
        
        {/* Create Poll Form */}
        {isCreating && (
          <div className="bg-[#292a2d] rounded-xl p-4 mb-4">
            <h3 className="text-sm font-medium text-white mb-4">Create a poll</h3>
            
            {/* Question */}
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full px-4 py-3 bg-[#3c4043] rounded-lg text-white 
                         placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-[#8ab4f8] mb-4"
            />
            
            {/* Options */}
            <div className="space-y-2 mb-4">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-2.5 bg-[#3c4043] rounded-lg text-white 
                               placeholder-gray-400 focus:outline-none focus:ring-2 
                               focus:ring-[#8ab4f8]"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 hover:bg-[#3c4043] rounded-full transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add option */}
            {options.length < 10 && (
              <button
                onClick={handleAddOption}
                className="flex items-center gap-2 text-sm text-[#8ab4f8] 
                           hover:text-[#aecbfa] mb-4"
              >
                <Plus className="h-4 w-4" />
                Add option
              </button>
            )}
            
            {/* Settings */}
            <div className="space-y-3 mb-4 pt-4 border-t border-gray-700">
              <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#3c4043] border-gray-600 
                             text-[#8ab4f8] focus:ring-[#8ab4f8]"
                />
                Allow multiple selections
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#3c4043] border-gray-600 
                             text-[#8ab4f8] focus:ring-[#8ab4f8]"
                />
                Anonymous voting
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 px-4 py-2.5 bg-[#3c4043] hover:bg-[#5f6368] 
                           text-white rounded-full font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                className="flex-1 px-4 py-2.5 bg-[#8ab4f8] hover:bg-[#aecbfa] 
                           text-[#202124] rounded-full font-medium transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Launch poll
              </button>
            </div>
          </div>
        )}
        
        {/* Active Poll */}
        {activePoll && (
          <PollCard
            poll={activePoll}
            participantId={participantId}
            isHostOrCoHost={isHostOrCoHost}
            onVote={handleVote}
            onClose={handleClosePoll}
            onDelete={handleDeletePoll}
            isActive
          />
        )}
        
        {/* Past Polls */}
        {polls.filter(p => p.id !== activePoll?.id).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Past polls</h3>
            <div className="space-y-3">
              {polls
                .filter(p => p.id !== activePoll?.id)
                .map(poll => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    participantId={participantId}
                    isHostOrCoHost={isHostOrCoHost}
                    onVote={handleVote}
                    onClose={handleClosePoll}
                    onDelete={handleDeletePoll}
                  />
                ))}
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {polls.length === 0 && !isCreating && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No polls yet</p>
            {isHostOrCoHost && (
              <p className="text-sm text-gray-500 mt-1">
                Create a poll to gather feedback
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
})

// Poll Card Component
interface PollCardProps {
  poll: Poll
  participantId: string
  isHostOrCoHost: boolean
  onVote: (pollId: string, optionId: string) => void
  onClose: (pollId: string) => void
  onDelete: (pollId: string) => void
  isActive?: boolean
}

const PollCard = memo(function PollCard({
  poll,
  participantId,
  isHostOrCoHost,
  onVote,
  onClose,
  onDelete,
  isActive = false,
}: PollCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  
  const hasVoted = poll.options.some(opt => opt.voterIds.includes(participantId))
  const showResults = hasVoted || poll.isClosed
  
  return (
    <div className={cn(
      "bg-[#292a2d] rounded-xl overflow-hidden",
      isActive && "ring-2 ring-[#8ab4f8]"
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="px-2 py-0.5 bg-[#8ab4f8] text-[#202124] text-xs font-medium rounded">
                Live
              </span>
            )}
            {poll.isClosed && (
              <span className="px-2 py-0.5 bg-gray-600 text-white text-xs font-medium rounded">
                Closed
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-white mt-1 truncate">{poll.question}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      
      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Options */}
          <div className="space-y-2">
            {poll.options.map(option => (
              <PollOptionRow
                key={option.id}
                option={option}
                totalVotes={poll.totalVotes}
                showResults={showResults}
                hasVoted={hasVoted}
                isSelected={option.voterIds.includes(participantId)}
                disabled={poll.isClosed || (hasVoted && !poll.allowMultiple)}
                onVote={() => onVote(poll.id, option.id)}
              />
            ))}
          </div>
          
          {/* Host actions */}
          {isHostOrCoHost && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
              {!poll.isClosed && (
                <button
                  onClick={() => onClose(poll.id)}
                  className="flex-1 px-4 py-2 bg-[#3c4043] hover:bg-[#5f6368] 
                             text-white text-sm rounded-full transition-colors"
                >
                  Close poll
                </button>
              )}
              <button
                onClick={() => onDelete(poll.id)}
                className="p-2 hover:bg-red-900/30 rounded-full transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// Poll Option Row
interface PollOptionRowProps {
  option: PollOption
  totalVotes: number
  showResults: boolean
  hasVoted: boolean
  isSelected: boolean
  disabled: boolean
  onVote: () => void
}

const PollOptionRow = memo(function PollOptionRow({
  option,
  totalVotes,
  showResults,
  isSelected,
  disabled,
  onVote,
}: PollOptionRowProps) {
  const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
  
  return (
    <button
      onClick={onVote}
      disabled={disabled}
      className={cn(
        "w-full relative overflow-hidden rounded-lg transition-colors",
        "text-left p-3",
        disabled ? "cursor-default" : "hover:bg-[#3c4043]",
        isSelected && "ring-2 ring-[#8ab4f8]"
      )}
    >
      {/* Progress bar background */}
      {showResults && (
        <div 
          className="absolute inset-0 bg-[#8ab4f8]/20 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      )}
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSelected && <Check className="h-4 w-4 text-[#8ab4f8]" />}
          <span className="text-sm text-white">{option.text}</span>
        </div>
        {showResults && (
          <span className="text-sm font-medium text-[#8ab4f8]">{percentage}%</span>
        )}
      </div>
    </button>
  )
})

PollsPanel.displayName = 'PollsPanel'
