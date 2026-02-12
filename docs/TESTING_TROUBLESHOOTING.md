# Phase 3.1 Testing Troubleshooting Guide

Quick reference for common issues during end-to-end testing.

---

## Connection Issues

### "Cannot connect to backend" / Network error
**Symptoms**: Browser shows connection error, Cannot reach API  
**Root Cause**: Backend not running or not accessible

**Solutions**:
1. Check if backend is running: `lsof -i :3000`
2. Check backend logs: `tail -f /tmp/backend.log`
3. Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
4. Try: `curl http://localhost:3000/api/v1/health` (if endpoint exists)

**If still failing**:
```bash
cd backend
npm install
npm run start:dev
```

---

### "Cannot connect to media server" / WebSocket error
**Symptoms**: Video doesn't load, "Socket connection failed"  
**Root Cause**: SFU not running or wrong port

**Solutions**:
1. Check if SFU running: `lsof -i :5000`
2. Check media server logs: `tail -f /tmp/media.log`
3. Verify `NEXT_PUBLIC_MEDIA_URL` in `frontend/.env.local` = `http://localhost:5000`
4. Check firewall isn't blocking port 5000

**If still failing**:
```bash
cd media
npm install
npm run dev
```

---

### "Failed to getRouterRtpCapabilities"
**Symptoms**: Error in browser console, video initialization fails  
**Root Cause**: SFU not responding, device not supported

**Solutions**:
1. Verify media server is running: `lsof -i :5000`
2. Check browser console for detailed error
3. Try different browser (Chrome/Firefox recommended)
4. Ensure camera/mic permissions granted

---

## Video/Audio Issues

### No video appears
**Symptoms**: Black video tile, no stream from participant  
**Likely Causes**: 
- Camera not available
- Permission denied
- Producer failed to start
- WebRTC not supported

**Solutions**:
1. Check browser console for errors
2. Verify camera permission granted (browser settings)
3. Try different camera if available: Check DevTools > Application > Permissions
4. Try Chrome/Firefox instead of Safari/Edge

```javascript
// Quick test in DevTools console
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('Camera access OK');
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('Camera error:', err));
```

---

### No audio heard
**Symptoms**: Video works, but no sound from other participants  
**Likely Causes**:
- Microphone not available
- Audio permission denied
- Muted by participant
- Audio output muted in browser

**Solutions**:
1. Check participant muted them: Look for mute icon
2. Check system audio: Is your speaker on?
3. Try unmute them (if you have permission)
4. Verify microphone permission in browser settings
5. Test audio with: `navigator.mediaDevices.enumerateDevices()`

---

### One-way audio (you can't hear them, they hear you)
**Symptoms**: Asymmetric audio communication  
**Likely Causes**: Network issue, consumer failed, producer muted

**Solutions**:
1. Ask other participant to check their mic is enabled
2. Check browser console errors on receiving side
3. Try toggling audio off/on for other participant
4. Check network quality (may drop audio track)

---

### Video freezes/stutters
**Symptoms**: Choppy video, frequent pauses  
**Likely Causes**: High latency, packet loss, low bandwidth, CPU throttled

**Solutions**:
1. Check network speed: 
   - Open DevTools > Network tab
   - Look for bitrate (should be 500kbps - 2.5Mbps peacetime)
2. Check latency: How many ms round-trip?
   - High RTT (>200ms) = delay
   - High packet loss (>5%) = drops
3. Close other applications consuming bandwidth
4. Try wired Ethernet instead of Wi-Fi
5. Move closer to Wi-Fi router

**If still freezing**:
- Try lower resolution: Quality indicator should adapt automatically
- Switch browsers (test with Chrome)

---

## Signaling Issues

### "Connection shows 'Connecting...' forever"
**Symptoms**: Status never changes from "Connecting" state  
**Likely Causes**: Socket.IO connection failed, server not sending events

**Solutions**:
1. Check DevTools Network > WS (WebSocket)
2. Should see connections to:
   - `ws://localhost:3000/socket.io/?...` (signaling)
   - `ws://localhost:5000/media` (media)
3. Check for CORS errors in console
4. Verify backend `CORS_ORIGINS` includes your frontend URL

---

### "Participant appears then disappears"
**Symptoms**: Video tile flashes, then vanishes  
**Likely Causes**: Connection interrupted, participant left immediately after joining

**Solutions**:
1. Check backend logs for errors
2. Verify participant actually still in meeting
3. Check for network disconnects (DevTools Network > WS)
4. Try refreshing page

---

### "Signaling events not received"
**Symptoms**: Changes don't broadcast (mute/unmute, leave, join)  
**Likely Causes**: Socket.IO not connected, namespace wrong

**Solutions**:
1. DevTools > Network > WS tab
2. Should see message flow
3. Check if `/socket.io/` endpoint loads
4. Verify `namespace: '/signaling'` in service code

---

## Performance Issues

### High CPU Usage (>80%)
**Symptoms**: Browser fans loud, system slow, battery drains fast  
**Likely Causes**: Video encoding without GPU acceleration, complex grid layout

**Solutions**:
1. Enable GPU acceleration in browser:
   - Chrome: Settings > Advanced > System > GPU acceleration
   - Firefox: about:config > WebGL
2. Reduce number of visible videos (hide some)
3. Lower resolution
4. Close other browser tabs
5. Try different browser

**Expected CPU**:
- 2-3 participants: 15-30% (one browser tab)
- 5 participants: 30-50% (one browser tab)
- If >60%: Likely no hardware acceleration

---

### High Memory Usage (>300MB per tab)
**Symptoms**: Browser slow, sluggish UI, crashes after 10+ minutes  
**Likely Causes**: Memory leaks, orphaned streams, disconnected consumers

**Solutions**:
1. Check DevTools > Memory > Take heap snapshot
2. Look for detached `<video>` elements
3. Count RTCPeerConnections: Should match # of participants
4. Count consumers: Should be (N-1) per user
5. Refresh page if memory never decreases

**Normal Memory**:
- 1 participant: 80-120 MB
- 3 participants: 150-200 MB
- 5 participants: 200-300 MB

If exceeding by >50MB, possible leak. Report with heap snapshot.

---

### High Network Usage (>5Mbps total)
**Symptoms**: Bandwidth meter shows red, ISP complaining  
**Likely Causes**: Video bitrate too high, multiple simultaneous streams

**Solutions**:
1. Check DevTools > Network
2. Filter by "media" or "socket.io"
3. Bitrate per user:
   - 1 speaker: 500-1000 kbps
   - 5 speakers: 2-3 Mbps total (expected)
4. If excessive (>5Mbps), lower resolution or frame rate

---

## Browser-Specific Issues

### Chrome Issues
**Video appears but is black**:
- Verify camera enabled
- Check `chrome://extensions` for blocking extensions
- Try incognito window (disables extensions)

**"Cannot find module 'react'"**:
```bash
cd frontend
npm install
npm run dev
```

---

### Firefox Issues
**Video quality very poor**:
- Firefox has VP8/VP9 codec support, but may use H.264 fallback
- Check DevTools console for codec negotiation
- Try Chrome for comparison

**Socket.IO connection issues**:
```javascript
// Check in DevTools console
if (typeof io !== 'undefined') console.log('Socket.IO loaded');
else console.error('Socket.IO not loaded');
```

---

### Safari Issues
**WebRTC not working**:
- Safari 11+ supports WebRTC
- May need to enable via Settings > Advanced
- Some codecs not supported
- **Recommendation**: Use Chrome for testing

---

## Database Issues

### "MongoDB connection failed"
**Symptoms**: Backend startup fails with MongoDB error  
**Solution**:
```bash
# Start MongoDB locally
mongod --dbpath /path/to/db

# Or with Docker
docker run -d -p 27017:27017 mongo:latest

# Verify
mongosh mongodb://localhost:27017
```

---

### "Redis connection failed"
**Symptoms**: Backend errors about Redis  
**Solution**:
```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:latest

# Verify
redis-cli ping  # Should return "PONG"
```

---

## Testing Environment Issues

### "Port already in use"
**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find what's using the port
lsof -i :3000

# Kill it (if it's old process)
kill -9 <PID>

# Or change port in backend/src/main.ts
# Change: app.listen(3000)
# To: app.listen(3001)
```

---

### "Cannot find module in imports"
**Error**: `Cannot find module 'mediasoup-client'`

**Solution**:
```bash
# Reinstall frontend dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

### "TypeScript compilation errors"
**Error**: `Unknown type 'Vector3D'` or similar

**Solution**:
```bash
# Rebuild TypeScript
npm run build

# Or check specific file
npx tsc --noEmit frontend/lib/types/index.ts
```

---

## Debug Mode

### Enable Verbose Logging

**Backend**:
```bash
# Set log level
export LOG_LEVEL=debug
npm run start:dev
```

**Media Server**:
```bash
# Enable verbose WebRTC logs
export DEBUG=mediasoup:*
npm run dev
```

**Frontend** (DevTools Console):
```javascript
// Enable Socket.IO debug
localStorage.debug = 'socket.io-client:*'
location.reload()
```

---

## Collecting Debug Info

When reporting an issue, collect:

1. **Browser**: Chrome/Firefox/Safari/Edge + version
2. **OS**: Windows/macOS/Linux
3. **Error Message**: Exact message from console
4. **Steps to Reproduce**: How to trigger the issue
5. **Logs**:
   ```bash
   # Collect logs
   tail -100 /tmp/backend.log > backend-debug.log
   tail -100 /tmp/media.log > media-debug.log
   # Browser: DevTools Console screenshot
   ```
6. **Network Info**: Ping, packet loss, ISP speed test
7. **Hardware**: CPU, RAM, GPU model
8. **Heap Snapshot**: DevTools Memory tab > Take snapshot
9. **Video**: Screen recording of the issue (if needed)

---

## Quick Fixes Checklist

If things aren't working:

- [ ] Restart all services (`./stop-testing.sh && ./start-testing.sh`)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Check all ports free: `lsof -i :3000; lsof -i :5000; lsof -i :3001`
- [ ] Check MongoDB running: `mongosh`
- [ ] Check Redis running: `redis-cli ping`
- [ ] Check no TypeScript errors: `npm run build`
- [ ] Try different browser (Chrome recommended)
- [ ] Try incognito window (disables extensions)
- [ ] Check DevTools console for errors (F12)
- [ ] Check backend logs: `tail /tmp/backend.log`
- [ ] Check media server logs: `tail /tmp/media.log`

---

## Still Stuck?

1. **Minimum Reproduction**: Get a single test case that fails
2. **Check Logs**: `tail -200 /tmp/backend.log` + `/tmp/media.log`
3. **DevTools**: Capture console errors + Network tab
4. **Describe**: OS, Browser, Exact steps, Expected vs Actual
5. **Share**: Logs + screenshots + error messages

**Common Solution**: Restart with clean setup:
```bash
./stop-testing.sh --remove-logs
rm -rf backend/node_modules media/node_modules frontend/node_modules
./start-testing.sh --clean
```

---

**Last Updated**: Phase 3.1 Testing Kickoff  
**For Phase 3.1 Testing Guide**: See [PHASE_3_1_TESTING_GUIDE.md](PHASE_3_1_TESTING_GUIDE.md)
