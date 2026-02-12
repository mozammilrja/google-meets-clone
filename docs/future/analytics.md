# Analytics & Insights

> Data-driven meeting intelligence and quality monitoring.

---

## Overview

Analytics transform raw meeting data into actionable insights:

- **Meeting Metrics** - Duration, attendance, punctuality
- **Participation Analysis** - Speaking time, engagement patterns
- **Quality Monitoring** - Network health, audio/video quality
- **Engagement Scores** - Reactions, chat activity, camera usage
- **Organizational Trends** - Meeting culture, productivity patterns

---

## Architecture

```
+------------------------------------------------------------------+
|                     Analytics Pipeline                            |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +-----------------+  |
|  | Event Collector  |  | Processing Engine|  | Reporting API   |  |
|  | - Real-time      |  | - Aggregation    |  | - Dashboards    |  |
|  | - Batch ingestion|  | - ML insights    |  | - Exports       |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                     |                     |            |
|           v                     v                     v            |
|  +------------------+  +------------------+  +-----------------+  |
|  | Time-series DB   |  | Data Warehouse   |  | Cache Layer     |  |
|  | (InfluxDB)       |  | (Snowflake)      |  | (Redis)         |  |
|  +------------------+  +------------------+  +-----------------+  |
+------------------------------------------------------------------+
```

---

## Data Collection

### Event Schema

```typescript
interface MeetingEvent {
  eventId: string
  eventType: EventType
  meetingId: string
  userId?: string
  timestamp: Date
  metadata: Record<string, any>
}

type EventType =
  | 'meeting.created'
  | 'meeting.started'
  | 'meeting.ended'
  | 'participant.joined'
  | 'participant.left'
  | 'participant.muted'
  | 'participant.unmuted'
  | 'camera.on'
  | 'camera.off'
  | 'screen.share.started'
  | 'screen.share.stopped'
  | 'chat.message'
  | 'reaction.sent'
  | 'hand.raised'
  | 'quality.degraded'
  | 'reconnection.occurred'

// Example events
const events: MeetingEvent[] = [
  {
    eventId: 'evt_1',
    eventType: 'participant.joined',
    meetingId: 'm_abc',
    userId: 'u_alice',
    timestamp: new Date('2026-02-09T10:00:15Z'),
    metadata: { latency: 45, deviceType: 'desktop' }
  },
  {
    eventId: 'evt_2',
    eventType: 'camera.on',
    meetingId: 'm_abc',
    userId: 'u_alice',
    timestamp: new Date('2026-02-09T10:00:18Z'),
    metadata: { resolution: '1280x720' }
  }
]
```

### Real-Time Telemetry

```typescript
interface QualityMetrics {
  meetingId: string
  userId: string
  timestamp: Date
  
  // Network
  rtt: number  // Round-trip time (ms)
  packetLoss: number  // Percentage
  jitter: number  // ms
  
  // Audio
  audioInBitrate: number
  audioOutBitrate: number
  audioPacketsLost: number
  
  // Video
  videoInBitrate: number
  videoOutBitrate: number
  videoFrameRate: number
  videoResolution: { width: number, height: number }
  
  // CPU
  cpuUsage: number  // Percentage
}

class TelemetryCollector {
  private interval: number = 5000  // Collect every 5s
  
  async collectMetrics(
    peerConnection: RTCPeerConnection
  ): Promise<QualityMetrics> {
    const stats = await peerConnection.getStats()
    const metrics: QualityMetrics = {
      meetingId: currentMeeting.id,
      userId: currentUser.id,
      timestamp: new Date(),
      rtt: 0,
      packetLoss: 0,
      jitter: 0,
      audioInBitrate: 0,
      audioOutBitrate: 0,
      audioPacketsLost: 0,
      videoInBitrate: 0,
      videoOutBitrate: 0,
      videoFrameRate: 0,
      videoResolution: { width: 0, height: 0 },
      cpuUsage: await this.getCPUUsage()
    }
    
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        metrics.rtt = report.currentRoundTripTime * 1000
      }
      
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        metrics.audioInBitrate = report.bytesReceived * 8 / report.timestamp
        metrics.audioPacketsLost = report.packetsLost
        metrics.jitter = report.jitter * 1000
      }
      
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        metrics.videoInBitrate = report.bytesReceived * 8 / report.timestamp
        metrics.videoFrameRate = report.framesPerSecond
        metrics.videoResolution = {
          width: report.frameWidth,
          height: report.frameHeight
        }
      }
    })
    
    // Send to analytics service
    await analyticsService.ingest(metrics)
    
    return metrics
  }
}
```

---

## Meeting Metrics

### Basic Statistics

```typescript
interface MeetingStats {
  meetingId: string
  
  // Duration
  scheduledDuration: number  // minutes
  actualDuration: number
  startedOnTime: boolean
  startDelay: number  // minutes
  
  // Attendance
  totalInvited: number
  totalJoined: number
  attendanceRate: number  // percentage
  averageDuration: number  // minutes per participant
  
  // Engagement
  cameraOnRate: number  // percentage of time
  micUnmutedRate: number
  chatMessages: number
  reactionsCount: number
  handRaisesCount: number
  
  // Technical
  averageQuality: QualityScore
  reconnections: number
  qualityIssues: number
}

async function computeMeetingStats(
  meetingId: string
): Promise<MeetingStats> {
  const meeting = await meetingService.get(meetingId)
  const events = await eventService.getAll(meetingId)
  const metrics = await metricsService.getAll(meetingId)
  
  // Calculate duration
  const startEvent = events.find(e => e.eventType === 'meeting.started')
  const endEvent = events.find(e => e.eventType === 'meeting.ended')
  const actualDuration = (endEvent.timestamp - startEvent.timestamp) / 60000
  
  // Calculate attendance
  const joinEvents = events.filter(e => e.eventType === 'participant.joined')
  const uniqueParticipants = new Set(joinEvents.map(e => e.userId))
  
  // Calculate engagement
  const cameraOnEvents = events.filter(e => e.eventType === 'camera.on')
  const cameraOffEvents = events.filter(e => e.eventType === 'camera.off')
  const cameraOnRate = calculateTimePercentage(
    cameraOnEvents,
    cameraOffEvents,
    actualDuration
  )
  
  return {
    meetingId,
    scheduledDuration: meeting.duration,
    actualDuration,
    startedOnTime: Math.abs(startEvent.timestamp - meeting.startTime) < 120000,
    startDelay: (startEvent.timestamp - meeting.startTime) / 60000,
    totalInvited: meeting.participants.length,
    totalJoined: uniqueParticipants.size,
    attendanceRate: (uniqueParticipants.size / meeting.participants.length) * 100,
    cameraOnRate,
    chatMessages: events.filter(e => e.eventType === 'chat.message').length,
    reactionsCount: events.filter(e => e.eventType === 'reaction.sent').length,
    averageQuality: computeAverageQuality(metrics),
    reconnections: events.filter(e => e.eventType === 'reconnection.occurred').length,
    qualityIssues: metrics.filter(m => m.packetLoss > 5 || m.rtt > 300).length
  }
}
```

---

## Participation Analysis

### Speaking Time Distribution

```typescript
interface ParticipationMetrics {
  userId: string
  name: string
  
  // Time metrics
  joinedAt: Date
  leftAt: Date
  totalDuration: number  // minutes
  
  // Speaking
  speakingTime: number  // seconds
  speakingPercentage: number
  longestMonologue: number  // seconds
  interruptions: number
  
  // Engagement
  cameraOnDuration: number  // seconds
  chatMessages: number
  reactions: number
  
  // Quality
  averageNetworkQuality: number  // 0-100
  technicalIssues: number
}

class ParticipationAnalyzer {
  async analyzeParticipant(
    meetingId: string,
    userId: string
  ): Promise<ParticipationMetrics> {
    const events = await eventService.getByUser(meetingId, userId)
    const audioLevels = await audioAnalyzer.getLevels(meetingId, userId)
    
    // Detect speaking periods (audio level > threshold)
    const speakingPeriods = this.detectSpeaking(audioLevels)
    const totalSpeakingTime = speakingPeriods.reduce(
      (sum, period) => sum + period.duration,
      0
    )
    
    // Detect interruptions (speaking while someone else is speaking)
    const interruptions = await this.detectInterruptions(
      meetingId,
      userId,
      speakingPeriods
    )
    
    return {
      userId,
      name: await userService.getName(userId),
      speakingTime: totalSpeakingTime,
      speakingPercentage: (totalSpeakingTime / meetingDuration) * 100,
      longestMonologue: Math.max(...speakingPeriods.map(p => p.duration)),
      interruptions: interruptions.length,
      // ... other metrics
    }
  }
  
  private detectSpeaking(
    audioLevels: AudioLevel[]
  ): Period[] {
    const threshold = 0.1  // Configurable
    const periods: Period[] = []
    let currentPeriod: Period | null = null
    
    audioLevels.forEach(sample => {
      if (sample.level > threshold) {
        if (!currentPeriod) {
          currentPeriod = { start: sample.timestamp, end: sample.timestamp }
        } else {
          currentPeriod.end = sample.timestamp
        }
      } else {
        if (currentPeriod) {
          periods.push(currentPeriod)
          currentPeriod = null
        }
      }
    })
    
    return periods
  }
}
```

### Dominance Score

```typescript
function calculateDominanceScore(
  participants: ParticipationMetrics[]
): number {
  // Measure how evenly speaking time is distributed
  // Lower score = more balanced, Higher score = more dominated
  
  const speakingTimes = participants.map(p => p.speakingTime)
  const total = speakingTimes.reduce((sum, t) => sum + t, 0)
  
  if (total === 0) return 0
  
  const expectedShare = total / participants.length
  
  // Calculate variance from expected share
  const variance = speakingTimes.reduce(
    (sum, time) => sum + Math.pow(time - expectedShare, 2),
    0
  ) / participants.length
  
  // Normalize to 0-100 scale
  const score = Math.min(100, (variance / expectedShare) * 10)
  
  return Math.round(score)
}
```

---

## Quality Monitoring

### Network Health Score

```typescript
function calculateNetworkHealthScore(
  metrics: QualityMetrics[]
): number {
  if (metrics.length === 0) return 100
  
  let score = 100
  
  // RTT penalty (target: <150ms)
  const avgRTT = average(metrics.map(m => m.rtt))
  if (avgRTT > 150) {
    score -= Math.min(30, (avgRTT - 150) / 10)
  }
  
  // Packet loss penalty (target: <1%)
  const avgPacketLoss = average(metrics.map(m => m.packetLoss))
  if (avgPacketLoss > 1) {
    score -= Math.min(40, avgPacketLoss * 10)
  }
  
  // Jitter penalty (target: <30ms)
  const avgJitter = average(metrics.map(m => m.jitter))
  if (avgJitter > 30) {
    score -= Math.min(20, (avgJitter - 30) / 5)
  }
  
  return Math.max(0, Math.round(score))
}
```

---

## Dashboards

### Personal Dashboard

```typescript
interface PersonalDashboard {
  userId: string
  period: 'week' | 'month' | 'quarter'
  
  stats: {
    totalMeetings: number
    totalMinutes: number
    averageMeetingDuration: number
    
    // Trends
    meetingsChange: number  // percentage vs previous period
    
    // Quality
    cameraOnRate: number
    punctualityRate: number  // percentage of meetings joined on time
  }
  
  topMeetings: MeetingStats[]  // Most attended
  colleagues: ColleagueStats[]  // Most frequent
}
```

### Organization Dashboard

```typescript
interface OrgDashboard {
  period: 'week' | 'month' | 'quarter'
  
  overview: {
    totalMeetings: number
    totalHours: number
    activeUsers: number
    averageMeetingSize: number
  }
  
  trends: {
    meetingCountTrend: Trend
    durationTrend: Trend
    participationTrend: Trend
  }
  
  insights: {
    peakMeetingHours: number[]  // Hours of day (0-23)
    averageStartDelay: number  // minutes
    mostProductiveDays: string[]  // day names
    meetingFatigue: number  // 0-100 score
  }
  
  recommendations: Recommendation[]
}
```

---

## Exports

### CSV Export

```typescript
async function exportMeetingReport(
  meetingId: string
): Promise<string> {
  const stats = await computeMeetingStats(meetingId)
  const participation = await Promise.all(
    stats.participants.map(p => analyzeParticipant(meetingId, p.userId))
  )
  
  const csv = [
    ['Participant', 'Duration (min)', 'Speaking Time (min)', 'Camera On %', 'Messages'],
    ...participation.map(p => [
      p.name,
      (p.totalDuration / 60).toFixed(1),
      (p.speakingTime / 60).toFixed(1),
      p.cameraOnPercentage.toFixed(0),
      p.chatMessages
    ])
  ]
  
  return csv.map(row => row.join(',')).join('\n')
}
```

---

## Roadmap

### Phase 1 (Q2 2026)
- Real-time quality monitoring
- Basic meeting stats

### Phase 2 (Q3 2026)
- Participation analysis
- Personal dashboards

### Phase 3 (Q4 2026)
- Organization dashboards
- Predictive insights

### Phase 4 (2027)
- ML-based recommendations
- Custom report builder
