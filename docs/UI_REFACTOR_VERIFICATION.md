# Full App UI Refactor Verification

> Next.js + TypeScript Google Meet Clone - shadcn/ui Migration Testing Guide

---

## Objective

Verify that after refactoring the UI to shadcn/ui components, the app works flawlessly end-to-end with all backend logic, WebRTC features, and real-time interactions intact. Ensure no TypeScript errors, no broken flows, and modern SaaS-level UX.

---

## Step 1: Backend Connectivity Check

### API Verification
- [ ] Open devtools → Network tab
- [ ] Confirm all API calls return status 200 and correct payloads:
  - [ ] `POST /api/v1/auth/login`
  - [ ] `POST /api/v1/auth/register`
  - [ ] `POST /api/v1/meetings` (create)
  - [ ] `POST /api/v1/meetings/:id/join`
  - [ ] `GET /api/v1/meetings/code/:code`
  - [ ] `GET /api/v1/users/me`

### WebSocket Verification
- [ ] Open devtools → Network → WS
- [ ] Confirm Socket.IO events work:
  - [ ] `connect` / `disconnect`
  - [ ] `participant-joined` / `participant-left`
  - [ ] `send-message` / `message-received`
  - [ ] Screen sharing events

---

## Step 2: Authentication Flows

### Login
- [ ] Login with valid credentials → redirects to lobby
- [ ] Login with invalid credentials → shows shadcn Alert with proper message
- [ ] Loading state visible during authentication

### Signup
- [ ] Card layout displays properly
- [ ] Success → redirects to lobby
- [ ] Error → shows appropriate message

### Form Validation
- [ ] Required fields trigger error states
- [ ] Invalid email shows validation message
- [ ] Password requirements enforced
- [ ] Check focus states and tab navigation for accessibility

---

## Step 3: Meeting Lobby

### Create Meeting
- [ ] Card panel displays correctly
- [ ] "New Meeting" button shows loading state while creating
- [ ] Backend confirms meeting created (check Network tab)
- [ ] Meeting code displayed after creation
- [ ] Share link input populated

### Join by Code
- [ ] Input field accepts meeting code
- [ ] Invalid code triggers error Alert
- [ ] Valid code redirects to meeting room
- [ ] Loading state during lookup

### Profile Menu
- [ ] DropdownMenu opens on click
- [ ] User name/email displayed
- [ ] Logout works and redirects to login

### Copy Meeting Link
- [ ] Button triggers Toast confirming copy
- [ ] Link copied to clipboard correctly

---

## Step 4: Meeting Room / WebRTC Features

### Video/Audio
- [ ] Local video stream displays in VideoTile
- [ ] Remote participant streams display
- [ ] Mute/unmute audio works
- [ ] Toggle camera on/off works
- [ ] Device switching works via DropdownMenu (if implemented)

### Chat Panel
- [ ] Messages appear in ScrollArea
- [ ] Input + Button from shadcn work
- [ ] Test long messages wrap correctly
- [ ] Multiple participants see messages in real-time
- [ ] Timestamps display correctly

### Participant Panel
- [ ] Sheet/Sidebar opens
- [ ] Avatars display for each participant
- [ ] Badges show roles (host/guest/participant)
- [ ] Participant count accurate

### Screen Sharing
- [ ] Start screen share → Banner/indicator visible
- [ ] Stop screen share → returns to camera
- [ ] Other participants receive screen share stream

### Bottom Control Bar
- [ ] All buttons clickable
- [ ] Tooltips visible on hover
- [ ] Disabled states correct (e.g., when connecting)
- [ ] Leave meeting button works

---

## Step 5: Global Components

### Theme Toggle
- [ ] Toggle dark/light mode works
- [ ] Theme persists across page navigation
- [ ] Theme persists after refresh (localStorage)
- [ ] All components render correctly in both themes

### Toaster / Notifications
- [ ] Toast appears for:
  - [ ] Meeting created
  - [ ] Link copied
  - [ ] Errors
- [ ] Toast dismisses automatically or on click

### Settings (if implemented)
- [ ] Tabs render correctly
- [ ] Separators visible
- [ ] Form controls work

### Accessibility
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus ring visible on interactive elements
- [ ] Aria-labels present on buttons/icons
- [ ] Screen reader compatible

---

## Step 6: Responsiveness

### Viewport Testing
- [ ] Desktop (1920x1080, 1440x900)
- [ ] Tablet (768x1024, 1024x768)
- [ ] Mobile (375x667, 414x896)

### Component Behavior
- [ ] Card layouts stack properly on mobile
- [ ] Sheet/Dialog full-width on mobile
- [ ] ScrollArea works on touch devices
- [ ] Video grid adapts to screen size
- [ ] Control bar remains accessible

### Touch Interactions
- [ ] Buttons respond to tap
- [ ] Swipe gestures work (if applicable)
- [ ] No hover-only interactions on mobile

---

## Step 7: Automated / Manual Smoke Tests

### Frontend (Cypress / Playwright)
- [ ] Login flow completes successfully
- [ ] Signup flow completes successfully
- [ ] Create meeting and get code
- [ ] Join meeting by code
- [ ] Send and receive chat message
- [ ] Toggle theme

### Backend (Postman / Insomnia)
- [ ] `POST /api/v1/auth/register` → 201
- [ ] `POST /api/v1/auth/login` → 200 + token
- [ ] `GET /api/v1/users/me` with token → 200
- [ ] `POST /api/v1/meetings` → 201 + meeting object
- [ ] `POST /api/v1/meetings/:id/join` → 200
- [ ] Socket.IO connection test

### WebRTC Multi-Tab Testing
- [ ] Open meeting in 2+ browser tabs
- [ ] Both participants see each other's video
- [ ] Mute/unmute reflected for other participants
- [ ] Screen share visible to all participants
- [ ] Leave meeting cleans up properly

---

## Step 8: Visual Polishing

### Design Review
- [ ] Compare before vs after screenshots
- [ ] Spacing consistent (8px grid system)
- [ ] Hover states visible and smooth
- [ ] Focus states accessible (ring visible)
- [ ] Color contrast meets WCAG AA

### Modern SaaS Standards
- [ ] Clean typography hierarchy
- [ ] Consistent border radius
- [ ] Subtle shadows where appropriate
- [ ] Smooth transitions/animations
- [ ] No jarring color mismatches

---

## Step 9: Build Verification

### TypeScript
- [ ] Run `npm run build` → zero TypeScript errors
- [ ] No `any` types in new code (or justified)
- [ ] Proper type definitions for props/state

### Code Quality
- [ ] No unused imports
- [ ] No console.log in production code
- [ ] ESLint passes (`npm run lint`)

### Tailwind CSS
- [ ] All classes applied correctly
- [ ] No conflicting styles
- [ ] Responsive prefixes work (sm:, md:, lg:)
- [ ] Dark mode classes work (dark:)

---

## Deliverables Checklist

| Category | Status |
|----------|--------|
| Auth flows (Login, Signup, Logout) | ⬜ |
| Meeting Lobby (Create, Join, Copy Link) | ⬜ |
| Meeting Room (Video, Audio, Controls) | ⬜ |
| Chat (Send, Receive, Real-time) | ⬜ |
| WebRTC (Multi-participant, Screen Share) | ⬜ |
| shadcn/ui components render correctly | ⬜ |
| Accessibility verified | ⬜ |
| Responsiveness confirmed | ⬜ |
| Build passes with zero errors | ⬜ |
| Visual polish matches SaaS standards | ⬜ |

---

## Sign-Off

**Tester:** ___________________

**Date:** ___________________

**Build Version:** ___________________

**Notes:**

```
(Add any issues found or additional observations here)
```
