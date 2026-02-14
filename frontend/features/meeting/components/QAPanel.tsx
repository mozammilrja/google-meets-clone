'use client'

import React, { memo, useState, useCallback } from 'react'
import { X, MessageCircleQuestion, Send, ThumbsUp, Check, Trash2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMeetingToolsStore, selectQAQuestions, type QAQuestion } from '../stores'
import { usePermissionsStore, selectIsHostOrCoHost } from '../stores'
import { signalingService } from '@/lib/services/signaling'

interface QAPanelProps {
  meetingId: string
  participantId: string
  participantName: string
  onClose: () => void
}

/**
 * Q&A Panel - Question and Answer functionality
 */
export const QAPanel = memo(function QAPanel({
  meetingId,
  participantId,
  participantName,
  onClose,
}: QAPanelProps) {
  const isHostOrCoHost = usePermissionsStore(selectIsHostOrCoHost)
  const questions = useMeetingToolsStore(selectQAQuestions)
  const qaEnabled = useMeetingToolsStore(state => state.qa.isEnabled)
  const askQuestion = useMeetingToolsStore(state => state.askQuestion)
  const upvoteQuestion = useMeetingToolsStore(state => state.upvoteQuestion)
  const markAsAnswered = useMeetingToolsStore(state => state.markAsAnswered)
  const hideQuestion = useMeetingToolsStore(state => state.hideQuestion)
  const deleteQuestion = useMeetingToolsStore(state => state.deleteQuestion)
  const setQAEnabled = useMeetingToolsStore(state => state.setQAEnabled)
  
  const [questionText, setQuestionText] = useState('')
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular')
  
  const handleSubmitQuestion = useCallback(() => {
    if (!questionText.trim() || !qaEnabled) return
    
    const question = askQuestion({
      meetingId,
      askedBy: participantId,
      askedByName: participantName,
      question: questionText.trim(),
    })
    
    // Broadcast to other participants
    signalingService.emit('qa-question-asked', {
      meetingId,
      question,
    })
    
    setQuestionText('')
  }, [questionText, qaEnabled, meetingId, participantId, participantName, askQuestion])
  
  const handleUpvote = useCallback((questionId: string) => {
    upvoteQuestion(questionId, participantId)
    signalingService.emit('qa-question-upvoted', {
      meetingId,
      questionId,
      participantId,
    })
  }, [meetingId, participantId, upvoteQuestion])
  
  const handleMarkAnswered = useCallback((questionId: string) => {
    markAsAnswered(questionId)
    signalingService.emit('qa-question-answered', {
      meetingId,
      questionId,
    })
  }, [meetingId, markAsAnswered])
  
  const handleHideQuestion = useCallback((questionId: string) => {
    hideQuestion(questionId)
    signalingService.emit('qa-question-hidden', {
      meetingId,
      questionId,
    })
  }, [meetingId, hideQuestion])
  
  const handleDeleteQuestion = useCallback((questionId: string) => {
    deleteQuestion(questionId)
    signalingService.emit('qa-question-deleted', {
      meetingId,
      questionId,
    })
  }, [meetingId, deleteQuestion])
  
  const handleToggleQA = useCallback(() => {
    const newEnabled = !qaEnabled
    setQAEnabled(newEnabled)
    signalingService.emit('qa-enabled-changed', {
      meetingId,
      enabled: newEnabled,
    })
  }, [qaEnabled, meetingId, setQAEnabled])
  
  // Filter and sort questions
  const filteredQuestions = questions
    .filter(q => {
      if (q.isHidden && !isHostOrCoHost) return false
      if (filter === 'answered') return q.isAnswered
      if (filter === 'unanswered') return !q.isAnswered
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'popular') {
        return b.upvotes - a.upvotes
      }
      return new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
    })
  
  const unansweredCount = questions.filter(q => !q.isAnswered && !q.isHidden).length
  
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
          <MessageCircleQuestion className="h-5 w-5 text-[#8ab4f8]" />
          <h2 className="text-lg font-medium text-white">Q&A</h2>
          {unansweredCount > 0 && (
            <span className="px-2 py-0.5 bg-[#8ab4f8] text-[#202124] text-xs font-medium rounded-full">
              {unansweredCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Host toggle for Q&A */}
          {isHostOrCoHost && (
            <button
              onClick={handleToggleQA}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                qaEnabled
                  ? "bg-green-900/30 text-green-400"
                  : "bg-red-900/30 text-red-400"
              )}
            >
              {qaEnabled ? 'Q&A On' : 'Q&A Off'}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#3c4043] transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-1">
          {(['all', 'unanswered', 'answered'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full transition-colors capitalize",
                filter === f
                  ? "bg-[#8ab4f8] text-[#202124]"
                  : "text-gray-400 hover:bg-[#3c4043]"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
            className="bg-transparent text-sm text-gray-400 focus:outline-none cursor-pointer"
          >
            <option value="popular">Most popular</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
      </div>
      
      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!qaEnabled && (
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-400">
              Q&A is currently disabled{isHostOrCoHost ? '' : ' by the host'}.
            </p>
          </div>
        )}
        
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map(question => (
            <QuestionCard
              key={question.id}
              question={question}
              participantId={participantId}
              isHostOrCoHost={isHostOrCoHost}
              onUpvote={handleUpvote}
              onMarkAnswered={handleMarkAnswered}
              onHide={handleHideQuestion}
              onDelete={handleDeleteQuestion}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <MessageCircleQuestion className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">
              {filter === 'all' 
                ? 'No questions yet' 
                : `No ${filter} questions`}
            </p>
            {qaEnabled && filter === 'all' && (
              <p className="text-sm text-gray-500 mt-1">
                Ask a question to get started
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Ask question input */}
      {qaEnabled && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmitQuestion()
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-3 bg-[#3c4043] rounded-full text-white 
                         placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-[#8ab4f8]"
            />
            <button
              onClick={handleSubmitQuestion}
              disabled={!questionText.trim()}
              className="p-3 bg-[#8ab4f8] hover:bg-[#aecbfa] rounded-full 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5 text-[#202124]" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
})

// Question Card Component
interface QuestionCardProps {
  question: QAQuestion
  participantId: string
  isHostOrCoHost: boolean
  onUpvote: (id: string) => void
  onMarkAnswered: (id: string) => void
  onHide: (id: string) => void
  onDelete: (id: string) => void
}

const QuestionCard = memo(function QuestionCard({
  question,
  participantId,
  isHostOrCoHost,
  onUpvote,
  onMarkAnswered,
  onHide,
  onDelete,
}: QuestionCardProps) {
  const hasUpvoted = question.upvoterIds.includes(participantId)
  const isOwnQuestion = question.askedBy === participantId
  
  // Format time
  const timeAgo = formatTimeAgo(new Date(question.askedAt))
  
  return (
    <div className={cn(
      "bg-[#292a2d] rounded-xl p-4",
      question.isHidden && "opacity-60",
      question.isAnswered && "border-l-4 border-green-500"
    )}>
      {/* Question header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {question.askedByName}
          </span>
          {isOwnQuestion && (
            <span className="px-1.5 py-0.5 bg-[#8ab4f8]/20 text-[#8ab4f8] text-xs rounded">
              You
            </span>
          )}
          {question.isAnswered && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check className="h-3 w-3" />
              Answered
            </span>
          )}
          {question.isHidden && isHostOrCoHost && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <EyeOff className="h-3 w-3" />
              Hidden
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{timeAgo}</span>
      </div>
      
      {/* Question text */}
      <p className="text-sm text-gray-200 mb-3">{question.question}</p>
      
      {/* Actions */}
      <div className="flex items-center justify-between">
        {/* Upvote */}
        <button
          onClick={() => onUpvote(question.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors",
            hasUpvoted 
              ? "bg-[#8ab4f8]/20 text-[#8ab4f8]" 
              : "text-gray-400 hover:bg-[#3c4043]"
          )}
        >
          <ThumbsUp className={cn("h-4 w-4", hasUpvoted && "fill-current")} />
          <span className="text-sm font-medium">{question.upvotes}</span>
        </button>
        
        {/* Host actions */}
        {isHostOrCoHost && (
          <div className="flex items-center gap-1">
            {!question.isAnswered && (
              <button
                onClick={() => onMarkAnswered(question.id)}
                className="p-2 hover:bg-green-900/30 rounded-full transition-colors"
                title="Mark as answered"
              >
                <Check className="h-4 w-4 text-green-400" />
              </button>
            )}
            <button
              onClick={() => onHide(question.id)}
              className="p-2 hover:bg-[#3c4043] rounded-full transition-colors"
              title={question.isHidden ? "Show question" : "Hide question"}
            >
              {question.isHidden ? (
                <Eye className="h-4 w-4 text-gray-400" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => onDelete(question.id)}
              className="p-2 hover:bg-red-900/30 rounded-full transition-colors"
              title="Delete question"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

// Helper: Format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  
  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

QAPanel.displayName = 'QAPanel'
