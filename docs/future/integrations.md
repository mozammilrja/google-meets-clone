# Third-Party Integrations

> Extend google -meets clone with calendar, productivity, and business tools.

---

## Overview

Integration capabilities enable google -meets clone to fit into existing workflows:

- **Calendar Systems** - Google Calendar, Outlook, Apple Calendar
- **Productivity Tools** - Slack, Microsoft Teams, Notion
- **CRM Systems** - Salesforce, HubSpot, Pipedrive
- **Project Management** - Jira, Asana, Monday.com
- **Webhooks & APIs** - Custom integrations and automation

---

## Architecture

```
+------------------------------------------------------------------+
|                    Integration Hub                                |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------------+  +-----------------+  +-------------------+  |
|  | OAuth Manager   |  | Webhook Engine  |  | API Gateway       |  |
|  | - Token storage |  | - Event routing |  | - Rate limiting   | |
|  | - Refresh flow  |  | - Retry logic   |  | - Auth middleware | |
|  +-----------------+  +-----------------+  +-------------------+  |
|           |                   |                     |              |
+-----------|--------------------|---------------------|-------------+
            |                    |                     |
            v                    v                     v
+------------------------------------------------------------------+
|                      Meeting Platform                             |
|  +---------------+  +---------------+  +------------------------+ |
|  | Calendar Sync |  | Event Bus     |  | REST + GraphQL APIs   | |
|  +---------------+  +---------------+  +------------------------+ |
+------------------------------------------------------------------+
```

---

## Calendar Integration

### Google Calendar

```typescript
interface CalendarIntegration {
  provider: 'google' | 'outlook' | 'apple'
  userId: string
  connected: boolean
  scopes: string[]
  lastSync?: Date
}

class GoogleCalendarSync {
  private oauth: OAuth2Client
  
  async authorize(userId: string): Promise<string> {
    const authUrl = this.oauth.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ]
    })
    
    return authUrl  // Redirect user to Google consent
  }
  
  async handleCallback(code: string, userId: string): Promise<void> {
    const { tokens } = await this.oauth.getToken(code)
    
    // Store tokens securely
    await integrationService.saveTokens(userId, 'google_calendar', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokens.expiry_date
    })
  }
  
  async createEvent(meeting: Meeting): Promise<string> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth })
    
    const event = {
      summary: meeting.title,
      description: `Join: ${meeting.joinUrl}`,
      start: {
        dateTime: meeting.startTime.toISOString(),
        timeZone: meeting.timezone
      },
      end: {
        dateTime: meeting.endTime.toISOString(),
        timeZone: meeting.timezone
      },
      attendees: meeting.participants.map(p => ({ email: p.email })),
      conferenceData: {
        createRequest: {
          requestId: meeting.id,
          conferenceSolutionKey: { type: 'exithostgMeet' }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'email', minutes: 60 }
        ]
      }
    }
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    })
    
    return response.data.id!
  }
  
  async syncUpcoming(userId: string): Promise<Meeting[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth })
    
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: weekFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    })
    
    // Extract google -meets clone links from events
    const meetings = response.data.items
      ?.filter(event => event.description?.includes('exithostg.meet'))
      .map(event => this.parseEventToMeeting(event))
    
    return meetings || []
  }
}
```

### Outlook/Microsoft 365

```typescript
class OutlookCalendarSync {
  private msalClient: ConfidentialClientApplication
  
  async createEvent(meeting: Meeting): Promise<string> {
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, this.getAccessToken())
      }
    })
    
    const event = {
      subject: meeting.title,
      body: {
        contentType: 'HTML',
        content: `<a href="${meeting.joinUrl}">Join Meeting</a>`
      },
      start: {
        dateTime: meeting.startTime.toISOString(),
        timeZone: meeting.timezone
      },
      end: {
        dateTime: meeting.endTime.toISOString(),
        timeZone: meeting.timezone
      },
      attendees: meeting.participants.map(p => ({
        emailAddress: { address: p.email, name: p.name },
        type: 'required'
      })),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'unknown',  // Custom provider
      onlineMeeting: {
        joinUrl: meeting.joinUrl
      }
    }
    
    const result = await graphClient.api('/me/events').post(event)
    return result.id
  }
}
```

---

## Slack Integration

### Meeting Notifications

```typescript
interface SlackConfig {
  workspaceId: string
  channelId: string
  notifyOnStart: boolean
  notifyOnEnd: boolean
  postRecording: boolean
}

class SlackIntegration {
  private client: WebClient
  
  async notifyMeetingStart(meeting: Meeting): Promise<void> {
    const message = {
      channel: meeting.slackChannel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎥 ${meeting.title} is starting`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Host: *${meeting.host.name}*\nParticipants: ${meeting.participants.length}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Join Meeting' },
              url: meeting.joinUrl,
              style: 'primary'
            }
          ]
        }
      ]
    }
    
    await this.client.chat.postMessage(message)
  }
  
  async postRecording(meeting: Meeting, recordingUrl: string): Promise<void> {
    const message = {
      channel: meeting.slackChannel,
      text: `Recording available for: ${meeting.title}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📹 *Recording Available*\n<${recordingUrl}|${meeting.title}>`
          }
        }
      ]
    }
    
    await this.client.chat.postMessage(message)
  }
  
  // Slash command: /meet
  async handleSlashCommand(payload: SlackSlashCommand): Promise<void> {
    // Parse command: /meet [now|schedule] [topic]
    const args = payload.text.split(' ')
    const action = args[0]
    
    if (action === 'now') {
      const meeting = await meetingService.createInstant({
        title: args.slice(1).join(' ') || 'Quick Meeting',
        host: payload.user_id
      })
      
      return {
        response_type: 'in_channel',
        text: `Meeting created: ${meeting.joinUrl}`
      }
    }
  }
}
```

---

## CRM Integration

### Salesforce

```typescript
interface SalesforceMeetingLog {
  contactId: string
  meetingId: string
  duration: number
  summary: string
  outcome?: 'success' | 'follow-up' | 'no-show'
}

class SalesforceIntegration {
  private conn: jsforce.Connection
  
  async logMeeting(log: SalesforceMeetingLog): Promise<string> {
    // Create Event record in Salesforce
    const event = {
      Subject: `google -meets clone: ${log.summary}`,
      WhoId: log.contactId,  // Contact/Lead ID
      DurationInMinutes: log.duration,
      ActivityDate: new Date().toISOString().split('T')[0],
      Description: `Meeting ID: ${log.meetingId}`,
      Type: 'Video Call',
      Status: log.outcome === 'no-show' ? 'Held' : 'Completed'
    }
    
    const result = await this.conn.sobject('Event').create(event)
    return result.id
  }
  
  async enrichParticipant(email: string): Promise<ContactInfo | null> {
    // Look up contact by email
    const result = await this.conn.query(
      `SELECT Id, Name, Title, Account.Name, Phone 
       FROM Contact 
       WHERE Email = '${email}' 
       LIMIT 1`
    )
    
    if (result.records.length === 0) return null
    
    const contact = result.records[0]
    return {
      id: contact.Id,
      name: contact.Name,
      title: contact.Title,
      company: contact.Account?.Name,
      phone: contact.Phone
    }
  }
}
```

---

## Webhook System

### Event Types

```typescript
type WebhookEvent =
  | 'meeting.created'
  | 'meeting.started'
  | 'meeting.ended'
  | 'participant.joined'
  | 'participant.left'
  | 'recording.completed'
  | 'chat.message'

interface WebhookSubscription {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string  // For signature verification
  active: boolean
  createdBy: string
}

interface WebhookPayload {
  event: WebhookEvent
  timestamp: Date
  data: any
  signature: string  // HMAC-SHA256
}
```

### Webhook Delivery

```typescript
class WebhookEngine {
  async deliver(
    subscription: WebhookSubscription,
    payload: WebhookPayload
  ): Promise<void> {
    // Sign payload
    const signature = this.sign(payload, subscription.secret)
    
    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      await webhookLogService.logSuccess(subscription.id, payload)
      
    } catch (error) {
      await webhookLogService.logFailure(subscription.id, payload, error)
      
      // Retry with exponential backoff
      await this.scheduleRetry(subscription, payload)
    }
  }
  
  private sign(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return hmac.digest('hex')
  }
  
  private async scheduleRetry(
    subscription: WebhookSubscription,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > 5) {
      // Give up after 5 attempts
      await webhookService.deactivate(subscription.id, 'max_retries')
      return
    }
    
    const delay = Math.pow(2, attempt) * 1000  // Exponential backoff
    
    setTimeout(() => {
      this.deliver(subscription, payload)
    }, delay)
  }
}
```

### Example Webhook Payload

```json
{
  "event": "meeting.ended",
  "timestamp": "2026-02-09T10:30:00Z",
  "data": {
    "meetingId": "m_abc123",
    "title": "Team Standup",
    "duration": 1820,
    "participants": [
      { "id": "u_1", "name": "Alice", "joinedAt": "...", "leftAt": "..." },
      { "id": "u_2", "name": "Bob", "joinedAt": "...", "leftAt": "..." }
    ],
    "recordingUrl": "https://cdn.exithostg.meet/recordings/xyz.mp4"
  },
  "signature": "a8f7d6e5c4b3a2f1..."
}
```

---

## Public API

### REST API

```typescript
// Authentication
POST /api/v1/auth
  Body: { apiKey: string }
  Response: { token: string }

// Meetings
POST /api/v1/meetings
  Body: CreateMeetingRequest
  Response: Meeting

GET /api/v1/meetings/:id
  Response: Meeting

DELETE /api/v1/meetings/:id
  Response: { success: boolean }

// Participants
POST /api/v1/meetings/:id/participants
  Body: { userId: string, role: string }
  Response: Participant

DELETE /api/v1/meetings/:id/participants/:userId
  Response: { success: boolean }

// Recordings
GET /api/v1/meetings/:id/recordings
  Response: Recording[]
```

### GraphQL API

```graphql
type Meeting {
  id: ID!
  title: String!
  startTime: DateTime!
  endTime: DateTime
  host: User!
  participants: [Participant!]!
  status: MeetingStatus!
  joinUrl: String!
  recording: Recording
}

type Query {
  meeting(id: ID!): Meeting
  meetings(filter: MeetingFilter): [Meeting!]!
  upcomingMeetings: [Meeting!]!
}

type Mutation {
  createMeeting(input: CreateMeetingInput!): Meeting!
  updateMeeting(id: ID!, input: UpdateMeetingInput!): Meeting!
  deleteMeeting(id: ID!): Boolean!
  
  inviteParticipant(meetingId: ID!, userId: ID!): Participant!
  removeParticipant(meetingId: ID!, userId: ID!): Boolean!
}

type Subscription {
  meetingUpdated(id: ID!): Meeting!
  participantJoined(meetingId: ID!): Participant!
  participantLeft(meetingId: ID!): Participant!
}
```

---

## SDK Support

### JavaScript/TypeScript

```typescript
import { ExitHostgMeet } from '@exithostg/meet-sdk'

const client = new ExitHostgMeet({
  apiKey: process.env.EXITHOSTG_API_KEY
})

// Create meeting
const meeting = await client.meetings.create({
  title: 'Team Sync',
  startTime: new Date('2026-02-10T15:00:00Z'),
  participants: ['user1@example.com', 'user2@example.com']
})

console.log('Join URL:', meeting.joinUrl)

// Listen for events
client.on('meeting.started', (event) => {
  console.log('Meeting started:', event.meetingId)
})
```

### Python

```python
from exithostg_meet import Client

client = Client(api_key=os.getenv('EXITHOSTG_API_KEY'))

# Create meeting
meeting = client.meetings.create(
    title='Team Sync',
    start_time='2026-02-10T15:00:00Z',
    participants=['user1@example.com', 'user2@example.com']
)

print(f'Join URL: {meeting.join_url}')
```

---

## Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| POST /api/v1/meetings | 100/hour |
| GET /api/v1/meetings/:id | 1000/hour |
| Webhooks (outbound) | 10/second |
| GraphQL | 500 points/hour |

---

## Roadmap

### Phase 1 (Q2 2026)
- Google Calendar
- Slack notifications
- Webhook system

### Phase 2 (Q3 2026)
- Outlook/Microsoft 365
- Salesforce CRM
- REST API v1

### Phase 3 (Q4 2026)
- GraphQL API
- Official SDKs (JS, Python, Go)
- Zapier integration

### Phase 4 (2027)
- Advanced CRM integrations
- Custom OAuth apps
- Marketplace for third-party plugins
