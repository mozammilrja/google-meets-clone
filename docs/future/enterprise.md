# Enterprise Features

> Administration, security, and compliance for organizations.

---

## Overview

Enterprise features enable large organizations to deploy and manage google -meets clone at scale:

- **Single Sign-On (SSO)** - SAML, OIDC, OAuth2
- **Admin Dashboard** - Centralized management
- **Access Controls** - Role-based permissions, policies
- **Compliance** - GDPR, HIPAA, SOC 2
- **Audit Logs** - Complete activity tracking
- **Data Residency** - Regional deployment options

---

## Tech Alignment

Enterprise features are implemented using the approved platform stack:

- **NestJS control plane** for org policy, RBAC enforcement, and SSO flows
- **MongoDB** for tenants, users, and `audit_logs`
- **Redis** for policy cache, session controls, and rate limiting
- **Go workers** for retention jobs, exports, and compliance workflows

---

## Architecture

```
+------------------------------------------------------------------+
|                    Enterprise Layer                               |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +-----------------+  |
|  | Identity Provider|  | Admin Console    |  | Policy Engine   |  |
|  | - SAML/OIDC     |  | - User mgmt      |  | - RBAC          |  |
|  | - Directory sync |  | - Settings       |  | - Restrictions  |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                     |                     |            |
|           v                     v                     v            |
|  +------------------+  +------------------+  +-----------------+  |
|  | Auth Service     |  | Audit Service    |  | Compliance      |  |
|  +------------------+  +------------------+  +-----------------+  |
+------------------------------------------------------------------+
            |
            v
+------------------------------------------------------------------+
|                      Core Platform                                |
+------------------------------------------------------------------+
```

---

## Single Sign-On (SSO)

### SAML 2.0

```typescript
interface SAMLConfig {
  orgId: string
  enabled: boolean
  
  // Identity Provider
  idpEntityId: string
  idpSSOUrl: string
  idpCertificate: string
  
  // Service Provider (google -meets clone)
  spEntityId: string
  spACSUrl: string  // Assertion Consumer Service URL
  spCertificate: string
  spPrivateKey: string
  
  // Attribute mapping
  attributeMapping: {
    email: string
    firstName: string
    lastName: string
    groups?: string
  }
  
  // Options
  signRequests: boolean
  requireEncryption: boolean
}

class SAMLAuthProvider {
  private sp: SAML2ServiceProvider
  
  async handleSSORequest(orgId: string): Promise<string> {
    const config = await getOrgSAMLConfig(orgId)
    
    // Generate SAML auth request
    const request = this.sp.createLoginRequest({
      idpSSOUrl: config.idpSSOUrl,
      nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    })
    
    // Redirect user to IdP
    return request.redirectUrl
  }
  
  async handleSSOResponse(
    samlResponse: string
  ): Promise<AuthResult> {
    // Parse and validate SAML response
    const parsed = await this.sp.parseLoginResponse(samlResponse)
    
    if (!parsed.success) {
      throw new Error('SAML validation failed')
    }
    
    // Extract user attributes
    const email = parsed.attributes[config.attributeMapping.email]
    const firstName = parsed.attributes[config.attributeMapping.firstName]
    const lastName = parsed.attributes[config.attributeMapping.lastName]
    
    // Create or update user
    const user = await userService.findOrCreate({
      email,
      firstName,
      lastName,
      authProvider: 'saml',
      orgId
    })
    
    // Generate session token
    const token = await authService.createSession(user.id)
    
    return { user, token }
  }
}
```

### OIDC / OAuth2

Use OAuth 2.0 for optional Google Sign-In, and OIDC for enterprise identity providers.

```typescript
interface OIDCConfig {
  orgId: string
  enabled: boolean
  
  // Provider details
  issuer: string  // e.g., https://accounts.google.com
  clientId: string
  clientSecret: string
  
  // Endpoints (auto-discovered or manual)
  authorizationEndpoint?: string
  tokenEndpoint?: string
  userInfoEndpoint?: string
  
  // Scopes
  scopes: string[]  // e.g., ['openid', 'email', 'profile']
  
  // Claim mapping
  claimMapping: {
    email: string
    name: string
    picture?: string
  }
}

class OIDCAuthProvider {
  async initiateLogin(orgId: string): Promise<string> {
    const config = await getOrgOIDCConfig(orgId)
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${BASE_URL}/auth/oidc/callback`,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: generateState(orgId)
    })
    
    return `${config.authorizationEndpoint}?${params}`
  }
  
  async handleCallback(
    code: string,
    state: string
  ): Promise<AuthResult> {
    const orgId = validateState(state)
    const config = await getOrgOIDCConfig(orgId)
    
    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${BASE_URL}/auth/oidc/callback`
      })
    })
    
    const tokens = await tokenResponse.json()
    
    // Get user info
    const userInfoResponse = await fetch(config.userInfoEndpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    
    const userInfo = await userInfoResponse.json()
    
    // Create or update user
    const user = await userService.findOrCreate({
      email: userInfo[config.claimMapping.email],
      name: userInfo[config.claimMapping.name],
      avatar: userInfo[config.claimMapping.picture],
      authProvider: 'oidc',
      orgId
    })
    
    return { user, token: await authService.createSession(user.id) }
  }
}
```

---

## Admin Dashboard

### Organization Management

```typescript
interface Organization {
  id: string
  name: string
  domain: string[]  // email domains
  
  // Settings
  settings: OrgSettings
  
  // Subscription
  plan: 'starter' | 'business' | 'enterprise'
  maxUsers: number
  features: string[]
  
  // Admins
  admins: string[]  // userIds
  
  createdAt: Date
}

interface OrgSettings {
  // Authentication
  ssoRequired: boolean
  allowedAuthMethods: ('email' | 'google' | 'saml' | 'oidc')[]
  
  // Meeting restrictions
  maxMeetingDuration: number  // minutes
  maxParticipants: number
  allowGuestJoin: boolean
  requireMeetingPassword: boolean
  
  // Recording
  recordingEnabled: boolean
  recordingRetention: number  // days
  autoRecordMeetings: boolean
  
  // Security
  endToEndEncryption: boolean
  waitingRoomDefault: boolean
  screenShareRestricted: boolean  // hosts only
  
  // Compliance
  dataResidency: 'us' | 'eu' | 'ap' | 'global'
  retentionPolicy: RetentionPolicy
}

interface RetentionPolicy {
  meetings: number  // days
  recordings: number
  chatHistory: number
  auditLogs: number
}
```

### User Management

```typescript
class OrgAdminService {
  async listUsers(
    orgId: string,
    filter?: UserFilter
  ): Promise<User[]> {
    return userService.findByOrg(orgId, filter)
  }
  
  async inviteUser(
    orgId: string,
    email: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    const invite = await inviteService.create({
      orgId,
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })
    
    await emailService.sendInvite(email, invite.token)
  }
  
  async removeUser(orgId: string, userId: string): Promise<void> {
    // Validate admin permissions
    await this.validateAdmin(orgId)
    
    // Remove user from organization
    await userService.removeFromOrg(userId, orgId)
    
    // Audit log
    await auditService.log({
      orgId,
      action: 'user.removed',
      actorId: currentUser.id,
      targetId: userId
    })
  }
  
  async updateUserRole(
    orgId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    await userService.updateRole(userId, orgId, role)
    
    await auditService.log({
      orgId,
      action: 'user.role_updated',
      actorId: currentUser.id,
      targetId: userId,
      metadata: { newRole: role }
    })
  }
}
```

---

## Access Controls

### Role-Based Access Control

RBAC is enforced in the control plane for all REST APIs and WebSocket events.

**Default RBAC Matrix**

| Role | Meetings | Recordings | Users | Settings | Audit Logs |
|------|----------|------------|-------|----------|------------|
| Admin | Org scope | Org scope | Org scope | Org scope | Org scope (read) |
| Host | Host scope | Own scope (read) | None | None | None |
| Participant | Own scope | Own scope (read) | None | None | None |
| Guest | Join-only | None | None | None | None |

```typescript
interface Permission {
  resource: string  // e.g., 'meetings', 'recordings', 'settings'
  action: 'create' | 'read' | 'update' | 'delete'
  scope: 'own' | 'org' | 'all'
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  orgId?: string  // null for system roles
}

const SystemRoles: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Organization-wide administration',
    permissions: [
      { resource: 'users', action: '*', scope: 'org' },
      { resource: 'settings', action: '*', scope: 'org' },
      { resource: 'meetings', action: 'read', scope: 'org' },
      { resource: 'recordings', action: 'read', scope: 'org' },
      { resource: 'audit_logs', action: 'read', scope: 'org' }
    ]
  },
  {
    id: 'host',
    name: 'Host',
    description: 'Meeting host controls',
    permissions: [
      { resource: 'meetings', action: '*', scope: 'own' },
      { resource: 'participants', action: 'update', scope: 'own' },
      { resource: 'recordings', action: 'read', scope: 'own' }
    ]
  },
  {
    id: 'participant',
    name: 'Participant',
    description: 'Standard meeting participant',
    permissions: [
      { resource: 'meetings', action: 'read', scope: 'own' },
      { resource: 'messages', action: 'create', scope: 'own' },
      { resource: 'recordings', action: 'read', scope: 'own' }
    ]
  },
  {
    id: 'guest',
    name: 'Guest',
    description: 'Limited, invite-only access',
    permissions: [
      { resource: 'meetings', action: 'read', scope: 'own' }
    ]
  }
]

class PermissionChecker {
  async can(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<boolean> {
    const user = await userService.get(userId)
    const roles = await roleService.getUserRoles(userId)
    
    for (const role of roles) {
      for (const permission of role.permissions) {
        if (this.matchesPermission(permission, action, resource)) {
          // Check scope
          if (permission.scope === 'all') return true
          if (permission.scope === 'org' && await this.inSameOrg(userId, resourceId)) return true
          if (permission.scope === 'own' && await this.isOwner(userId, resourceId)) return true
        }
      }
    }
    
    return false
  }
  
  private matchesPermission(
    permission: Permission,
    action: string,
    resource: string
  ): boolean {
    const actionMatch = permission.action === '*' || permission.action === action
    const resourceMatch = permission.resource === '*' || permission.resource === resource
    return actionMatch && resourceMatch
  }
}
```

---

## Compliance

### GDPR Compliance

```typescript
interface DataSubjectRequest {
  id: string
  type: 'access' | 'deletion' | 'portability'
  userId: string
  submittedAt: Date
  status: 'pending' | 'processing' | 'completed'
  completedAt?: Date
}

class GDPRComplianceService {
  async handleAccessRequest(userId: string): Promise<UserDataExport> {
    // Collect all user data
    const user = await userService.get(userId)
    const meetings = await meetingService.getByUser(userId)
    const recordings = await recordingService.getByUser(userId)
    const chatHistory = await chatService.getByUser(userId)
    
    return {
      profile: user,
      meetings,
      recordings,
      chatHistory,
      exportedAt: new Date()
    }
  }
  
  async handleDeletionRequest(userId: string): Promise<void> {
    // Anonymize or delete user data
    await userService.anonymize(userId)
    await meetingService.removeUserData(userId)
    await chatService.deleteMessages(userId)
    
    // Keep audit trail (legal requirement)
    await auditService.log({
      action: 'user.gdpr_deletion',
      userId,
      timestamp: new Date()
    })
  }
  
  async handlePortabilityRequest(userId: string): Promise<string> {
    const data = await this.handleAccessRequest(userId)
    
    // Generate machine-readable export (JSON)
    const jsonExport = JSON.stringify(data, null, 2)
    
    // Upload to secure storage
    const url = await storageService.upload(
      Buffer.from(jsonExport),
      `gdpr-exports/${userId}-${Date.now()}.json`,
      { expiresIn: 30 * 24 * 60 * 60 }  // 30 days
    )
    
    return url
  }
}
```

### HIPAA Compliance

```typescript
interface HIPAASettings {
  enabled: boolean
  
  // Encryption
  endToEndEncryption: true  // Required
  encryptAtRest: true
  
  // Access controls
  requireMFA: true
  sessionTimeout: number  // minutes
  
  // Audit
  detailedAuditLogs: true
  auditLogRetention: number  // years (minimum 6)
  
  // Business Associate Agreement
  baaSignedDate?: Date
  baaDocument?: string
}

class HIPAAComplianceService {
  async enableHIPAA(orgId: string): Promise<void> {
    // Verify BAA is signed
    const baa = await baaService.get(orgId)
    if (!baa || !baa.signed) {
      throw new Error('Business Associate Agreement must be signed first')
    }
    
    // Apply HIPAA settings
    await orgService.updateSettings(orgId, {
      endToEndEncryption: true,
      encryptAtRest: true,
      requireMFA: true,
      sessionTimeout: 15,
      detailedAuditLogs: true,
      auditLogRetention: 6,  // years
      recordingConsent: 'explicit'  // All participants must consent
    })
    
    // Enable PHI detection (optional)
    await enablePHIDetection(orgId)
  }
  
  async detectPHI(text: string): Promise<PHIDetectionResult> {
    // Scan for Protected Health Information
    const patterns = {
      ssn: /\b\d{3}-\d{2}-\d{4}\b/,
      mrn: /\bMRN[:\s]?\d{6,10}\b/i,
      dateOfBirth: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      // ... more patterns
    }
    
    const findings: PHIFinding[] = []
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern)
      if (matches) {
        findings.push({
          type,
          value: matches[0],
          confidence: 0.9
        })
      }
    }
    
    return { hasPHI: findings.length > 0, findings }
  }
}
```

---

## Audit Logs

### Storage and Retention

Audit logs are stored in the `audit_logs` collection in MongoDB with strict retention controls.

**Core schema:**

```typescript
interface AuditLogDocument {
  _id: string
  orgId: string
  actorId: string
  actorIP: string
  actorUserAgent: string
  action: string
  resource: string
  resourceId?: string
  timestamp: Date
  metadata: Record<string, any>
  success: boolean
  errorMessage?: string
}
```

**Indexes:**
- `{ orgId: 1, timestamp: -1 }` for tenant queries
- `{ actorId: 1, timestamp: -1 }` for user activity
- `{ action: 1, timestamp: -1 }` for incident review

**Retention policy:**
- Default: 180 days (configurable)
- HIPAA: minimum 6 years (configurable)
- Legal hold: retention suspended across all data types

### Event Tracking

```typescript
interface AuditEvent {
  id: string
  orgId: string
  
  // Who
  actorId: string
  actorIP: string
  actorUserAgent: string
  
  // What
  action: string
  resource: string
  resourceId?: string
  
  // When
  timestamp: Date
  
  // Details
  metadata: Record<string, any>
  success: boolean
  errorMessage?: string
}

const AuditActions = {
  // Auth
  'auth.login': 'User logged in',
  'auth.logout': 'User logged out',
  'auth.failed': 'Login failed',
  
  // Meetings
  'meeting.created': 'Meeting created',
  'meeting.started': 'Meeting started',
  'meeting.ended': 'Meeting ended',
  'meeting.recorded': 'Recording started',
  
  // Users
  'user.invited': 'User invited',
  'user.removed': 'User removed',
  'user.role_updated': 'User role changed',
  
  // Settings
  'settings.updated': 'Organization settings changed',
  'sso.enabled': 'SSO enabled',
  'sso.disabled': 'SSO disabled'
}

class AuditService {
  async log(event: Partial<AuditEvent>): Promise<void> {
    const fullEvent: AuditEvent = {
      id: generateId(),
      orgId: event.orgId || currentOrg.id,
      actorId: event.actorId || currentUser.id,
      actorIP: event.actorIP || currentRequest.ip,
      actorUserAgent: event.actorUserAgent || currentRequest.userAgent,
      action: event.action!,
      resource: event.resource!,
      resourceId: event.resourceId,
      timestamp: new Date(),
      metadata: event.metadata || {},
      success: event.success ?? true,
      errorMessage: event.errorMessage
    }
    
    // Store in time-series database
    await auditLogDB.insert(fullEvent)
    
    // Alert on critical events
    if (this.isCritical(fullEvent.action)) {
      await alertService.notify(fullEvent)
    }
  }
  
  async query(
    orgId: string,
    filter: AuditFilter
  ): Promise<AuditEvent[]> {
    return auditLogDB.query({
      orgId,
      startDate: filter.startDate,
      endDate: filter.endDate,
      actorId: filter.userId,
      action: filter.action,
      resource: filter.resource
    })
  }
  
  async export(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const events = await this.query(orgId, { startDate, endDate })
    
    const csv = [
      ['Timestamp', 'Actor', 'Action', 'Resource', 'IP', 'Success'],
      ...events.map(e => [
        e.timestamp.toISOString(),
        e.actorId,
        e.action,
        e.resource,
        e.actorIP,
        e.success ? 'Yes' : 'No'
      ])
    ]
    
    return csv.map(row => row.join(',')).join('\n')
  }
}
```

---

## Data Residency

### Regional Deployment

```typescript
interface Region {
  code: string  // 'us-east', 'eu-west', 'ap-southeast'
  name: string
  location: string
  
  // Infrastructure
  apiEndpoint: string
  mediaEndpoint: string
  storageEndpoint: string
  
  // Compliance
  certifications: string[]  // ['SOC2', 'GDPR', 'ISO27001']
}

const Regions: Region[] = [
  {
    code: 'us-east',
    name: 'US East',
    location: 'Virginia, USA',
    apiEndpoint: 'https://us-east.api.exithostg.meet',
    mediaEndpoint: 'wss://us-east.media.exithostg.meet',
    storageEndpoint: 'https://us-east.storage.exithostg.meet',
    certifications: ['SOC2', 'HIPAA']
  },
  {
    code: 'eu-west',
    name: 'EU West',
    location: 'Ireland, EU',
    apiEndpoint: 'https://eu-west.api.exithostg.meet',
    mediaEndpoint: 'wss://eu-west.media.exithostg.meet',
    storageEndpoint: 'https://eu-west.storage.exithostg.meet',
    certifications: ['SOC2', 'GDPR', 'ISO27001']
  }
]

class DataResidencyService {
  async setOrgRegion(orgId: string, regionCode: string): Promise<void> {
    const region = Regions.find(r => r.code === regionCode)
    if (!region) throw new Error('Invalid region')
    
    // Migrate data to new region
    await this.migrateData(orgId, region)
    
    // Update organization settings
    await orgService.updateSettings(orgId, { dataResidency: regionCode })
  }
  
  private async migrateData(orgId: string, region: Region): Promise<void> {
    // 1. Copy all organization data to new region
    // 2. Verify data integrity
    // 3. Switch DNS/routing
    // 4. Delete data from old region
    
    // This is a multi-step process with rollback capability
  }
}
```

### Organization-Level Region Pinning

- Region selection is set at the organization level
- Data and recordings remain in the selected region
- Cross-region movement is blocked unless explicitly configured

### Residency Controls

- **Region pinning**: orgs are locked to a single region unless an authorized migration is initiated
- **Export controls**: data exports are restricted to compliance-approved regions
- **Legal hold**: retention is suspended for specified users, meetings, or recordings

---

## Secrets Management and Key Rotation

- **JWT signing keys**: rotate every 90 days with dual-key validation windows
- **OAuth client secrets**: rotated quarterly or on provider policy changes
- **SAML certificates**: rotate before expiration with overlap support
- **DTLS-SRTP certs**: rotated on a fixed schedule per region
- **Storage credentials**: short-lived tokens where possible

Rotation is coordinated in the control plane and audited in `audit_logs`.

---

## Roadmap

### Phase 1 (Q2 2026)
- SAML SSO
- Basic admin dashboard
- Audit logs

### Phase 2 (Q3 2026)
- OIDC/OAuth2 support
- RBAC system
- GDPR compliance tools

### Phase 3 (Q4 2026)
- HIPAA compliance
- Data residency options
- Advanced reporting

### Phase 4 (2027)
- SOC 2 certification
- Custom compliance frameworks
- Multi-region replication
