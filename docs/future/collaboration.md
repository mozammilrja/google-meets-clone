# Advanced Collaboration

> Interactive tools for enhanced team engagement.

---

## Overview

Beyond video and chat, modern collaboration requires shared workspaces and interactive tools:

- **Whiteboard** - Infinite canvas for brainstorming
- **Breakout Rooms** - Split participants into smaller groups
- **Polls & Q&A** - Gather feedback and questions
- **Screen Annotations** - Draw on shared screens
- **File Sharing** - Drag-and-drop document sharing

---

## Architecture

```
+------------------------------------------------------------------+
|                   Collaboration Server                            |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +-------------------+  +----------------+ |
|  | Whiteboard Engine |  | Breakout Manager  |  | Poll Service  | |
|  | - CRDT sync       |  | - Room assignment |  | - Voting      | |
|  | - Shape library   |  | - Audio routing   |  | - Results     | |
|  | - Export PDF/PNG  |  | - Session mgmt    |  | - Analytics   | |
|  +-------------------+  +-------------------+  +----------------+ |
|           |                     |                     |            |
|           +---------------------+---------------------+            |
|                                 |                                  |
|                    +------------+------------+                     |
|                    | Real-time Sync Engine  |                     |
|                    | - WebSocket + WebRTC   |                     |
|                    +------------------------+                     |
+------------------------------------------------------------------+
```

---

## Whiteboard

### Overview

Collaborative infinite canvas with drawing, shapes, text, and images.

### Data Model

```typescript
interface WhiteboardState {
  id: string
  meetingId: string
  
  // Canvas elements
  elements: WhiteboardElement[]
  
  // Collaboration state
  cursors: Map<string, CursorPosition>
  selections: Map<string, string[]>  // userId -> elementIds
  
  // View state per user
  viewports: Map<string, Viewport>
}

type WhiteboardElement = 
  | PathElement      // Freehand drawing
  | ShapeElement     // Rect, circle, arrow
  | TextElement      // Text boxes
  | ImageElement     // Uploaded images
  | StickyNote       // Sticky notes

interface PathElement {
  id: string
  type: 'path'
  points: Point[]
  stroke: string
  strokeWidth: number
  createdBy: string
  createdAt: Date
}

interface ShapeElement {
  id: string
  type: 'rect' | 'circle' | 'arrow' | 'line'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke: string
  strokeWidth: number
}

interface StickyNote {
  id: string
  type: 'sticky'
  x: number
  y: number
  width: number
  height: number
  content: string
  color: 'yellow' | 'pink' | 'blue' | 'green'
  author: string
}
```

### CRDT Synchronization

```typescript
import * as Y from 'yjs'

class WhiteboardSync {
  private ydoc: Y.Doc
  private elements: Y.Array<any>
  private awareness: awarenessProtocol.Awareness
  
  initialize(meetingId: string): void {
    this.ydoc = new Y.Doc()
    this.elements = this.ydoc.getArray('elements')
    
    // Sync via WebSocket
    const provider = new WebsocketProvider(
      `wss://collab.exithostg.meet/whiteboard/${meetingId}`,
      meetingId,
      this.ydoc
    )
    
    this.awareness = provider.awareness
  }
  
  addElement(element: WhiteboardElement): void {
    this.ydoc.transact(() => {
      this.elements.push([element])
    })
  }
  
  updateElement(id: string, updates: Partial<WhiteboardElement>): void {
    this.ydoc.transact(() => {
      const index = this.elements.toArray().findIndex(e => e.id === id)
      if (index !== -1) {
        const current = this.elements.get(index)
        this.elements.delete(index, 1)
        this.elements.insert(index, [{ ...current, ...updates }])
      }
    })
  }
  
  // Broadcast cursor position
  updateCursor(position: { x: number, y: number }): void {
    this.awareness.setLocalStateField('cursor', position)
  }
}
```

### Canvas Rendering

```typescript
class WhiteboardCanvas {
  private ctx: CanvasRenderingContext2D
  private camera: { x: number, y: number, zoom: number }
  
  render(state: WhiteboardState): void {
    this.clear()
    
    // Apply camera transform
    this.ctx.save()
    this.ctx.translate(this.camera.x, this.camera.y)
    this.ctx.scale(this.camera.zoom, this.camera.zoom)
    
    // Render elements
    state.elements.forEach(element => {
      this.renderElement(element)
    })
    
    // Render other users' cursors
    state.cursors.forEach((cursor, userId) => {
      this.renderCursor(cursor, userId)
    })
    
    this.ctx.restore()
  }
  
  private renderElement(element: WhiteboardElement): void {
    switch (element.type) {
      case 'path':
        this.renderPath(element)
        break
      case 'rect':
        this.renderRect(element)
        break
      case 'sticky':
        this.renderStickyNote(element)
        break
      // ... other types
    }
  }
}
```

---

## Breakout Rooms

### Overview

Temporarily split participants into smaller groups for focused discussions.

### Room Management

```typescript
interface BreakoutConfig {
  roomCount: number
  assignment: 'manual' | 'automatic' | 'self-select'
  duration?: number  // Auto-close after N minutes
  allowRoomSwitching: boolean
}

interface BreakoutRoom {
  id: string
  name: string
  participants: string[]  // userIds
  host: string  // userId
  
  // Media state
  audioChannel: string
  videoChannel: string
}

class BreakoutRoomManager {
  async createBreakoutRooms(
    meetingId: string,
    config: BreakoutConfig
  ): Promise<BreakoutRoom[]> {
    const participants = await getParticipants(meetingId)
    
    // Create rooms
    const rooms: BreakoutRoom[] = []
    for (let i = 0; i < config.roomCount; i++) {
      rooms.push({
        id: generateId(),
        name: `Breakout Room ${i + 1}`,
        participants: [],
        host: participants[0].id,  // Main host is host of all rooms
        audioChannel: generateChannelId(),
        videoChannel: generateChannelId()
      })
    }
    
    // Assign participants
    if (config.assignment === 'automatic') {
      this.autoAssign(participants, rooms)
    }
    
    return rooms
  }
  
  private autoAssign(
    participants: Participant[],
    rooms: BreakoutRoom[]
  ): void {
    // Round-robin assignment
    participants.forEach((p, index) => {
      const roomIndex = index % rooms.length
      rooms[roomIndex].participants.push(p.id)
    })
  }
  
  async moveToRoom(
    userId: string,
    roomId: string
  ): Promise<void> {
    // Disconnect from main meeting media
    await this.disconnectMedia(userId)
    
    // Connect to breakout room media
    const room = await this.getRoom(roomId)
    await this.connectMedia(userId, room)
    
    // Notify all participants
    this.broadcastRoomUpdate(roomId)
  }
  
  async closeAllRooms(meetingId: string): Promise<void> {
    const rooms = await this.getRooms(meetingId)
    
    // Move everyone back to main room
    for (const room of rooms) {
      for (const userId of room.participants) {
        await this.returnToMain(userId, meetingId)
      }
    }
    
    // Clean up rooms
    await this.deleteRooms(rooms.map(r => r.id))
  }
}
```

### Audio Routing

```
Main Meeting
    |
    +-- Breakout Room 1 (SFU instance A)
    |       |
    |       +-- User 1 <--> User 2 <--> User 3
    |
    +-- Breakout Room 2 (SFU instance B)
    |       |
    |       +-- User 4 <--> User 5
    |
    +-- Breakout Room 3 (SFU instance C)
            |
            +-- User 6 <--> User 7 <--> User 8
```

---

## Polls & Q&A

### Poll System

```typescript
interface Poll {
  id: string
  meetingId: string
  question: string
  type: 'single' | 'multiple' | 'open-ended'
  options: PollOption[]
  
  // Settings
  anonymous: boolean
  showResults: 'after-vote' | 'after-close' | 'never'
  
  // State
  status: 'draft' | 'active' | 'closed'
  responses: PollResponse[]
}

interface PollOption {
  id: string
  text: string
  votes?: number  // Hidden until results shown
}

interface PollResponse {
  userId: string
  pollId: string
  selectedOptions: string[]  // optionIds
  timestamp: Date
}

// Create and launch poll
async function createPoll(poll: Poll): Promise<void> {
  await pollService.create(poll)
  
  // Broadcast to all participants
  broadcastEvent({
    type: 'poll.started',
    payload: {
      pollId: poll.id,
      question: poll.question,
      options: poll.options,
      anonymous: poll.anonymous
    }
  })
}

// Submit vote
async function submitVote(
  pollId: string,
  selectedOptions: string[]
): Promise<void> {
  await pollService.vote(pollId, {
    userId: currentUser.id,
    selectedOptions,
    timestamp: new Date()
  })
  
  // Optionally show results
  const poll = await pollService.get(pollId)
  if (poll.showResults === 'after-vote') {
    displayResults(poll)
  }
}
```

### Q&A System

```typescript
interface Question {
  id: string
  meetingId: string
  author: string
  text: string
  timestamp: Date
  
  // Engagement
  upvotes: number
  upvotedBy: string[]
  
  // Status
  answered: boolean
  answer?: {
    text: string
    answeredBy: string
    timestamp: Date
  }
}

class QAManager {
  async submitQuestion(text: string): Promise<Question> {
    const question: Question = {
      id: generateId(),
      meetingId: currentMeeting.id,
      author: currentUser.id,
      text,
      timestamp: new Date(),
      upvotes: 0,
      upvotedBy: [],
      answered: false
    }
    
    await qaService.create(question)
    broadcastEvent({ type: 'question.new', payload: question })
    
    return question
  }
  
  async upvote(questionId: string): Promise<void> {
    await qaService.upvote(questionId, currentUser.id)
    
    // Sort questions by upvotes
    const questions = await qaService.getAll(currentMeeting.id)
    const sorted = questions.sort((a, b) => b.upvotes - a.upvotes)
    
    updateQAPanel(sorted)
  }
  
  async markAnswered(
    questionId: string,
    answerText: string
  ): Promise<void> {
    await qaService.answer(questionId, {
      text: answerText,
      answeredBy: currentUser.id,
      timestamp: new Date()
    })
    
    broadcastEvent({ type: 'question.answered', payload: { questionId } })
  }
}
```

---

## Screen Annotations

### Overview

Allow presenters to draw on their shared screen in real-time.

```typescript
interface AnnotationTool {
  type: 'pen' | 'highlighter' | 'arrow' | 'text' | 'eraser'
  color: string
  size: number
}

class ScreenAnnotationLayer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private strokes: Stroke[]
  
  startAnnotation(tool: AnnotationTool): void {
    this.currentTool = tool
    
    // Overlay transparent canvas on screen share
    this.canvas.style.position = 'absolute'
    this.canvas.style.top = '0'
    this.canvas.style.left = '0'
    this.canvas.style.pointerEvents = 'auto'
  }
  
  onMouseDown(e: MouseEvent): void {
    this.isDrawing = true
    this.currentStroke = {
      points: [{ x: e.offsetX, y: e.offsetY }],
      tool: this.currentTool
    }
  }
  
  onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return
    
    this.currentStroke.points.push({ x: e.offsetX, y: e.offsetY })
    this.render()
    
    // Broadcast to other participants
    this.broadcastStroke(this.currentStroke)
  }
  
  onMouseUp(): void {
    this.isDrawing = false
    this.strokes.push(this.currentStroke)
  }
}
```

---

## File Sharing

### Drag-and-Drop Sharing

```typescript
interface SharedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedBy: string
  timestamp: Date
  url: string
}

class FileShareManager {
  async uploadFile(file: File): Promise<SharedFile> {
    // Upload to cloud storage
    const url = await storageService.upload(file, {
      bucket: 'meeting-files',
      meetingId: currentMeeting.id
    })
    
    const sharedFile: SharedFile = {
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedBy: currentUser.id,
      timestamp: new Date(),
      url
    }
    
    // Notify participants
    broadcastEvent({
      type: 'file.shared',
      payload: sharedFile
    })
    
    return sharedFile
  }
  
  async downloadFile(fileId: string): Promise<void> {
    const file = await fileService.get(fileId)
    
    // Create download link
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.name
    a.click()
  }
}
```

---

## Roadmap

### Phase 1 (Q2 2026)
- Basic whiteboard
- Polls

### Phase 2 (Q3 2026)
- Breakout rooms
- Q&A system

### Phase 3 (Q4 2026)
- Screen annotations
- File sharing

### Phase 4 (2027)
- Advanced whiteboard features (templates, shapes library)
- Persistent whiteboards across meetings
