# Phase 3.1 End-to-End Testing & Deployment Guide

## Overview
This guide provides step-by-step instructions to validate Phase 3.1 video streaming implementation with 3-5 concurrent participants.

**Estimated Duration**: 45-60 minutes  
**Environment**: Local development setup  
**Participants**: 3-5 browser instances

---

## Pre-Test Checklist

### System Requirements
- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] 4GB+ RAM available
- [ ] Stable network connection
- [ ] 3-5 browser tabs/windows (Chrome/Firefox recommended)

### Services to Run
- [ ] Backend (NestJS) on port 3000
- [ ] Media Server (Mediasoup SFU) on port 5000
- [ ] Frontend (Next.js) on port 3000 (or 3001 if conflicts)

---

## Test Setup

### Step 1: Update Environment Variables

**backend/.env**
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/exitmeet
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
REDIS_URL=redis://localhost:6379
```

**frontend/.env.local**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3000
NEXT_PUBLIC_MEDIA_URL=http://localhost:5000
```

### Step 2: Start MongoDB & Redis (if not running)

```bash
# Terminal 1: MongoDB (or use Docker)
mongod --dbpath /path/to/db

# Terminal 2: Redis (or use Docker)
redis-server
```

### Step 3: Start Backend Service

```bash
# Terminal 3
cd backend
npm install  # if not done
npm run start:dev
```

**Expected Output**:
```
[Nest] 1234  - 02/10/2026, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 1234  - 02/10/2026, 10:00:01 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized
[Nest] 1234  - 02/10/2026, 10:00:02 AM     LOG [InstanceLoader] MongooseModule dependencies initialized
[Nest] 1234  - 02/10/2026, 10:00:02 AM     LOG [NestApplication] Nest application successfully started on port 3000
```

✅ Backend is ready when you see "successfully started on port 3000"

### Step 4: Start Media Server (SFU)

```bash
# Terminal 4
cd media
npm install  # if not done
npm run dev
```

**Expected Output**:
```
[Media Server] Listening on port 5000
[Media Server] STUN server configured for ICE
[Media Server] RTP codecs configured: Opus, VP8, VP9, H.264
```

✅ SFU is ready when you see "Listening on port 5000"

### Step 5: Start Frontend

```bash
# Terminal 5
cd frontend
npm install  # if not done
npm run dev
```

**Expected Output**:
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  ▲ Ready in 2.5s
```

✅ Frontend is ready when you see "Ready in Xs"

---

## Test Execution

### Phase 1: Single User Test (Baseline)

**Objective**: Verify local media capture and UI rendering

**Steps**:
1. Open http://localhost:3000 in Browser Tab 1
2. Signup with email: `user1@test.com` / password: `Test123!`
3. Click "New Meeting"
4. Copy the meeting code
5. Open meeting and wait 5 seconds for initialization

**Validation Checklist**:
- [ ] Login page loads without errors
- [ ] Signup form works
- [ ] Meeting lobby displays correctly
- [ ] Meeting room page loads
- [ ] Local video preview appears
- [ ] Audio toggle button works (audio track changes)
- [ ] Video toggle button works (video track changes)
- [ ] Connection status shows "Connected" (not "Connecting...")
- [ ] No console errors
- [ ] Meeting code displayed correctly

**Document**:
```
Test 1 - Single User
Result: [PASS/FAIL]
Time to Initialize: ___ seconds
Issues Found: [List any issues]
```

---

### Phase 2: Two-User Video Test

**Objective**: Verify bidirectional video streaming

**Steps**:
1. **Tab 1** (User 1): Already in meeting from Phase 1
2. **Tab 2** (User 2):
   - Open http://localhost:3000
   - Signup with: `user2@test.com` / password: `Test123!`
   - Click "Join Meeting"
   - Paste the code from Tab 1
   - Click "Join"
   - Wait 5 seconds

**Validation Checklist**:
- [ ] User 2 appears in Tab 1's video grid after 2-5 seconds
- [ ] User 1 appears in Tab 2's video grid after 2-5 seconds
- [ ] Both video tiles show accurate participant names
- [ ] Quality indicator appears (colored dot)
- [ ] Hover reveals stats: Bitrate, FPS, Resolution, RTT
- [ ] No audio/video lag (< 1 second end-to-end)
- [ ] Both can toggle audio independently
- [ ] Both can toggle video independently
- [ ] Tab 1: User 2's video disappears when User 2 toggles video off
- [ ] Tab 2: User 1's video disappears when User 1 toggles video off
- [ ] No connection errors in console
- [ ] CPU usage under 50% on both browsers

**Document**:
```
Test 2 - Two-User Video
Result: [PASS/FAIL]
Time User 2 appeared in Tab 1: ___ seconds
Time User 1 appeared in Tab 2: ___ seconds
Bitrate on Tab 1: ___ kbps
Bitrate on Tab 2: ___ kbps
Video latency: ___ ms
Issues Found: [List any issues]
```

---

### Phase 3: Multi-User Test (3-5 Participants)

**Objective**: Verify scalability and grid layout

**Steps**:
1. **Tab 1-2**: Already in meeting (Users 1 & 2)
2. **Tab 3** (User 3):
   - Signup with: `user3@test.com` / password: `Test123!`
   - Join meeting with code
   - Wait 3 seconds
3. **Tab 4** (User 4):
   - Signup with: `user4@test.com` / password: `Test123!`
   - Join meeting with code
   - Wait 3 seconds
4. **Tab 5** (User 5) - Optional:
   - Signup with: `user5@test.com` / password: `Test123!`
   - Join meeting with code
   - Wait 3 seconds

**Validation Checklist**:
- [ ] All participants visible in all tabs
- [ ] Grid layout adapts (1→2→3 rows as needed)
- [ ] All video tiles render correctly
- [ ] No missing or duplicate participants
- [ ] Quality indicators all visible
- [ ] Stats hover works for all participants
- [ ] No lag when new participant joins
- [ ] Participant count accurate (N+1 including self)
- [ ] Average bitrate per participant: 500kbps-2Mbps
- [ ] No crashed browser tabs
- [ ] CPU usage stable (not increasing over time)
- [ ] Memory usage (check DevTools > Memory)

**Document**:
```
Test 3 - Multi-User (N=5 Participants)
Result: [PASS/FAIL]
Tab 1 Grid Layout: ___x___ (rows x cols)
Tab 1 CPU Usage: ___% (at 3 min mark)
Tab 1 Memory: ___ MB
Average Bitrate: ___ kbps
Highest Bitrate: ___ kbps
Issues Found: [List any issues]
```

---

### Phase 4: Reconnect & Network Stability

**Objective**: Verify recovery from temporary disconnections

**Precondition**: 3-4 participants in meeting (from Phase 3)

**Test 4A: Temporary Network Disconnect**

**Steps**:
1. Open DevTools on Tab 1 (press F12)
2. Go to Network tab
3. Click throttle dropdown → select "Offline"
4. Wait 5 seconds
5. Select "Online" to reconnect
6. Wait 10 seconds for recovery

**Validation Checklist**:
- [ ] Connection status shows "Disconnected" while offline
- [ ] Video froze (expected behavior)
- [ ] On reconnect, status changes to "Connected"
- [ ] All remote videos resume within 3-5 seconds
- [ ] No console errors
- [ ] Local video continues (self-preview not affected)
- [ ] No participants left the meeting in other tabs

**Document**:
```
Test 4A - Temporary Disconnect
Result: [PASS/FAIL]
Time to Show "Disconnected": ___ seconds
Time to Show "Connected" after online: ___ seconds
Time for Video To Resume: ___ seconds
Issues Found: [List any issues]
```

**Test 4B: Slow Network (2G Throttling)**

**Steps**:
1. Open DevTools on Tab 2
2. Go to Network tab
3. Select throttle: "Slow 4G" or "Fast 3G"
4. Wait 10 seconds observing quality changes
5. Reset throttle

**Validation Checklist**:
- [ ] Quality indicator changes to "poor" or "fair"
- [ ] Bitrate drops to 200-500 kbps
- [ ] Video still plays (may be pixelated)
- [ ] Audio continues without major gaps
- [ ] No stuck/frozen screens
- [ ] On return to normal, quality recovers

**Document**:
```
Test 4B - Slow Network
Result: [PASS/FAIL]
Quality Level at 2G: [poor/fair/good]
Bitrate at 2G: ___ kbps
Recovery Time to Good: ___ seconds
Issues Found: [List any issues]
```

---

### Phase 5: Participant Join/Leave Behavior

**Objective**: Verify dynamic participant addition/removal

**Precondition**: 3 participants (Tabs 1, 2, 3)

**Test 5A: Participant Leave**

**Steps**:
1. On Tab 2, click "Leave Meeting"
2. Observe other tabs (1, 3) for 3 seconds
3. On Tab 1 and Tab 3, verify User 2 is removed

**Validation Checklist**:
- [ ] Tab 2 redirects to lobby
- [ ] Tab 1 shows User 2's video tile disappears within 2 seconds
- [ ] Tab 3 shows User 2's video tile disappears within 2 seconds
- [ ] No hanging consumers or memory leaks
- [ ] Participant count decreases
- [ ] No console errors in remaining tabs
- [ ] Other participants' video unaffected

**Document**:
```
Test 5A - Participant Leave
Result: [PASS/FAIL]
Time to Remove User from Tab 1: ___ seconds
Time to Remove User from Tab 3: ___ seconds
Console Errors: [None / List errors]
Issues Found: [List any issues]
```

**Test 5B: Participant Rejoin**

**Steps**:
1. Tab 2 rejoins with same code
2. Wait 5 seconds
3. Verify on Tabs 1 & 3

**Validation Checklist**:
- [ ] Tab 2 successfully joins again
- [ ] Tab 1 sees User 2 rejoin (new video tile)
- [ ] Tab 3 sees User 2 rejoin
- [ ] Participant count correct
- [ ] All video streams stable after rejoin
- [ ] No duplicate tiles or artifacts

**Document**:
```
Test 5B - Participant Rejoin
Result: [PASS/FAIL]
Time to Appear After Rejoin: ___ seconds
Issues Found: [List any issues]
```

---

### Phase 6: Clean Shutdown & Cleanup

**Objective**: Verify proper resource cleanup

**Steps**:
1. All 3+ participants in meeting
2. Close or refresh one tab (User 3)
3. Verify cleanup in other tabs
4. Close another tab (User 2)
5. Verify final cleanup (User 1 alone)
6. User 1 leaves meeting
7. Check backend/SFU logs for no orphaned connections

**Validation Checklist**:
- [ ] Tab closed/refreshed: Other tabs detect leave within 2 seconds
- [ ] No orphaned video tiles
- [ ] No orphaned consumers in memory
- [ ] Final user leaves: Backend logs "meeting cleaned up" or similar
- [ ] No lingering Socket.IO connections
- [ ] Backend/SFU show clean shutdown logs
- [ ] No resource leaks (check DevTools Memory)
- [ ] Rejoining same meeting code works without issues

**Document**:
```
Test 6 - Cleanup & Shutdown
Result: [PASS/FAIL]
Time to Detect Tab Close: ___ seconds
Memory After Cleanup: ___ MB
Backend Logs Clean: [Yes/No]
Issues Found: [List any issues]
```

---

### Phase 7: Camera On/Off (Track Replacement)

**Objective**: Verify track replacement without reconnection

**Precondition**: 2-3 participants visible

**Steps**:
1. Tab 1: Click video toggle OFF
2. Observe Tab 2 & 3 for 3 seconds
3. Tab 1: Click video toggle ON
4. Observe Tab 2 & 3 for 3 seconds

**Validation Checklist**:
- [ ] Tab 1 video disappears for others (shows "Camera Off")
- [ ] Other participants' video unaffected
- [ ] No connection errors
- [ ] Toggle OFF: No reconnection delay
- [ ] Toggle ON: Video resumes within 2 seconds
- [ ] No console errors
- [ ] Participant still in grid
- [ ] Name/indicators still visible

**Document**:
```
Test 7 - Camera Toggle (Track Replacement)
Result: [PASS/FAIL]
Time to Turn Off: ___ seconds
Time to Turn On: ___ seconds
Issues Found: [List any issues]
```

---

### Phase 8: Browser DevTools Memory Monitor

**Objective**: Detect memory leaks over extended session

**Precondition**: 3-4 participants, meeting active for 2+ minutes

**Steps**:
1. Open DevTools on Tab 1
2. Go to Memory tab
3. Take heap snapshot (baseline)
4. Wait 2 minutes with normal activity (toggle audio/video)
5. Take second heap snapshot
6. Compare growth

**Validation Checklist**:
- [ ] Memory growth < 20MB over 2 minutes
- [ ] No detached DOM nodes (in DevTools)
- [ ] Consumer/producer counts stable
- [ ] Video store size matches participants
- [ ] No "red" or "yellow" warnings in console
- [ ] Heap snapshots show no leaks

**Document**:
```
Test 8 - Memory Leak Detection
Result: [PASS/FAIL]
Baseline Memory: ___ MB
After 2 Min: ___ MB
Growth: ___ MB
Detached DOM Nodes: ___
Issues Found: [List any issues]
```

---

## Issues Tracking Template

For each issue found, document:

```
ISSUE #[number]
Title: [Brief description]
Severity: [Critical / High / Medium / Low]
Component: [Backend / SFU / Frontend / Network]
Environment: [Browser, OS, Network conditions]
Steps to Reproduce:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
Expected: [What should happen]
Actual: [What happened]
Console Error: [Copy error message if applicable]
Potential Cause: [Your analysis]
Workaround: [If any]
Status: [Open / Investigating / Fixed]
```

---

## Success Criteria

### All Tests Pass If:
- ✅ Single user: Video/audio capture works, UI responsive
- ✅ Two users: Bidirectional video/audio, stats visible, toggle works
- ✅ Multi-user (5): All visible, grid scales, bitrate stable
- ✅ Reconnect: Recovery < 5 seconds, video resumes
- ✅ Slow network: Quality indicator updates, video degrades gracefully
- ✅ Join/leave: Participants added/removed dynamically, no lag
- ✅ Track replacement: Camera toggle < 2 seconds, no reconnect
- ✅ Cleanup: No orphaned connections, resources freed
- ✅ Memory: Growth < 30MB over session, no leaks detected

### Known Limitations (Expected):
⚠️ Screen sharing UI placeholder (currently no rendering in grid)  
⚠️ Mobile browser: May have different performance profile  
⚠️ Network latency > 200ms: Video delay increases proportionally  
⚠️ Very low bandwidth (<256kbps): Video quality severely degraded

---

## Troubleshooting

### "Cannot find module 'react'" error
```bash
cd frontend
npm install
```

### "MONGODB_NOT_RUNNING" error
```bash
# Start MongoDB
mongod --dbpath /path/to/db
# Or with Docker
docker run -d -p 27017:27017 mongo
```

### "Cannot connect to media server" error
- Verify `NEXT_PUBLIC_MEDIA_URL` in frontend/.env.local = `http://localhost:5000`
- Verify media server running: `http://localhost:5000/health` (if endpoint exists)
- Check firewall: port 5000 must be accessible

### "High CPU usage" (>80%)
**Likely Cause**: VP8/VP9 encoding without hardware acceleration
**Solution**: 
- Check browser GPU acceleration in settings
- May be normal in local dev environment
- Production deployment should show <50% CPU

### "Videos not appearing" but "connected" shows
- Check DevTools Network tab: Are WebRTC messages flowing?
- Try refreshing browser tab
- Verify SFU not throttling: Check media server logs for errors

### "Audio one-way only"
- Both participants must have microphone permission
- Check system audio settings
- Try toggling audio on offending participant

---

## Reporting Results

After completing all tests, create a summary:

```markdown
# Phase 3.1 Validation Report

**Date**: [Date]
**Environment**: [Local Dev / Staging]
**Participants**: [Number tested]
**Duration**: [Total time]

## Test Results Summary

| Test | Result | Issues | Notes |
|------|--------|--------|-------|
| Phase 1 - Single User | PASS/FAIL | [#] | |
| Phase 2 - Two Users | PASS/FAIL | [#] | |
| Phase 3 - Multi-User | PASS/FAIL | [#] | |
| Phase 4 - Reconnect | PASS/FAIL | [#] | |
| Phase 5 - Join/Leave | PASS/FAIL | [#] | |
| Phase 6 - Cleanup | PASS/FAIL | [#] | |
| Phase 7 - Track Replacement | PASS/FAIL | [#] | |
| Phase 8 - Memory | PASS/FAIL | [#] | |

## Critical Issues Found
[List any critical blockers]

## High Priority Issues
[List issues affecting usability]

## Recommendations
[Suggested improvements or next steps]

## Approved For
- [ ] Phase 3.2 (Screen Sharing & Chat)
- [ ] Phase 4 (Infrastructure)
```

---

## Next Actions

### If All Tests Pass ✅
1. Update IMPLEMENTATION.md with "Phase 3.1 Validation Complete"
2. Proceed to Phase 3.2 (Screen Sharing & Chat)
3. Begin Phase 4 (Infrastructure) planning

### If Issues Found 🔧
1. Categorize by severity
2. Fix critical issues before proceeding
3. Create GitHub issues for non-blocking problems
4. Re-run affected tests

### If Major Problems 🛑
1. Debug in detail with console logs
2. Check backend/SFU server logs
3. Review network traffic with Wireshark (if needed)
4. Post detailed reproduction case

---

**Ready to test? Start with Step 1 above!** 🚀
