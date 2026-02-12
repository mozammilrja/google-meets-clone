# MongoDB Data Models

## Collections
- users
- meetings
- participants
- chat_messages
- recordings
- roles

## Example Schemas

### users
- _id: ObjectId
- email: String
- name: String
- role: String
- createdAt: Date

### meetings
- _id: ObjectId
- hostId: ObjectId
- code: String
- status: String
- scheduledAt: Date
- settings: Object

### participants
- _id: ObjectId
- meetingId: ObjectId
- userId: ObjectId
- role: String
- joinedAt: Date

### chat_messages
- _id: ObjectId
- meetingId: ObjectId
- senderId: ObjectId
- text: String
- sentAt: Date

### recordings
- _id: ObjectId
- meetingId: ObjectId
- url: String
- duration: Number
- createdAt: Date

### roles
- _id: ObjectId
- name: String
- permissions: [String]

## Indexing
- meetings.code unique
- participants.meetingId
- chat_messages.meetingId + sentAt

## Security Notes
- Encrypt PII fields
- Use least-privilege DB roles
