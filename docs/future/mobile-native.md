# Native Mobile Apps

> iOS and Android native applications for google -meets clone.

---

## Overview

Native mobile apps provide optimized meeting experiences on smartphones and tablets:

- **iOS App** - Swift, UIKit/SwiftUI
- **Android App** - Kotlin, Jetpack Compose
- **Shared WebRTC** - Platform-specific media handling
- **Push Notifications** - Meeting reminders and invites
- **Background Audio** - Continue listening with screen off
- **Picture-in-Picture** - Multitask during meetings

---

## Architecture

```
+------------------------------------------------------------------+
|                    Mobile App Architecture                        |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------------------+         +-----------------------+      |
|  |     iOS App           |         |    Android App        |      |
|  |                       |         |                       |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  | UI Layer       |   |         |  | UI Layer       |   |      |
|  |  | (SwiftUI)      |   |         |  | (Compose)      |   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  | Business Logic |   |         |  | Business Logic |   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  | WebRTC (native)|   |         |  | WebRTC (native)|   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  |  | Network Layer  |   |         |  | Network Layer  |   |      |
|  |  +----------------+   |         |  +----------------+   |      |
|  +-----------------------+         +-----------------------+      |
|           |                                 |                      |
|           +----------------+----------------+                      |
|                            |                                       |
|                            v                                       |
|               +---------------------------+                        |
|               |   Backend Services        |                        |
|               |   - REST API              |                        |
|               |   - WebSocket Signaling   |                        |
|               |   - SFU Media Servers     |                        |
|               +---------------------------+                        |
+------------------------------------------------------------------+
```

---

## iOS App

### Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Swift 5.9+ |
| UI Framework | SwiftUI + UIKit |
| WebRTC | GoogleWebRTC framework |
| Networking | URLSession + Combine |
| State | @StateObject, @ObservableObject |
| Persistence | CoreData / UserDefaults |
| Push | APNs (Apple Push Notification service) |

### Project Structure

```
ExitHostgMeet-iOS/
├── App/
│   ├── ExitHostgMeetApp.swift       # App entry point
│   └── AppDelegate.swift            # Push notifications
├── Views/
│   ├── MeetingLobbyView.swift       # Pre-join screen
│   ├── MeetingRoomView.swift        # Main meeting UI
│   ├── ParticipantGridView.swift    # Video grid
│   ├── ControlsView.swift           # Mic, camera, share buttons
│   └── ChatView.swift               # Chat panel
├── ViewModels/
│   ├── MeetingViewModel.swift
│   ├── ParticipantViewModel.swift
│   └── ChatViewModel.swift
├── Models/
│   ├── Meeting.swift
│   ├── Participant.swift
│   └── Message.swift
├── Services/
│   ├── APIService.swift             # REST API client
│   ├── WebRTCService.swift          # WebRTC management
│   ├── SignalingService.swift       # WebSocket signaling
│   └── PushNotificationService.swift
├── Utilities/
│   └── Extensions.swift
└── Resources/
    └── Assets.xcassets
```

### WebRTC Integration

```swift
import WebRTC

class WebRTCService: ObservableObject {
    @Published var localVideoTrack: RTCVideoTrack?
    @Published var remoteVideoTracks: [String: RTCVideoTrack] = [:]
    
    private var peerConnectionFactory: RTCPeerConnectionFactory!
    private var peerConnection: RTCPeerConnection?
    private var videoCapturer: RTCCameraVideoCapturer?
    
    init() {
        setupPeerConnectionFactory()
    }
    
    private func setupPeerConnectionFactory() {
        RTCInitializeSSL()
        
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        
        peerConnectionFactory = RTCPeerConnectionFactory(
            encoderFactory: encoderFactory,
            decoderFactory: decoderFactory
        )
    }
    
    func startLocalVideo() {
        let videoSource = peerConnectionFactory.videoSource()
        
        videoCapturer = RTCCameraVideoCapturer(delegate: videoSource)
        
        localVideoTrack = peerConnectionFactory.videoTrack(
            with: videoSource,
            trackId: "video0"
        )
        
        // Start camera capture
        guard let capturer = videoCapturer,
              let camera = RTCCameraVideoCapturer.captureDevices().first(where: { $0.position == .front })
        else { return }
        
        let format = RTCCameraVideoCapturer.supportedFormats(for: camera).last!
        let fps = format.videoSupportedFrameRateRanges.first!.maxFrameRate
        
        capturer.startCapture(
            with: camera,
            format: format,
            fps: Int(fps)
        )
    }
    
    func createPeerConnection(config: RTCConfiguration) {
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: ["DtlsSrtpKeyAgreement": "true"]
        )
        
        peerConnection = peerConnectionFactory.peerConnection(
            with: config,
            constraints: constraints,
            delegate: self
        )
        
        // Add local tracks
        if let videoTrack = localVideoTrack {
            peerConnection?.add(videoTrack, streamIds: ["stream0"])
        }
    }
}

extension WebRTCService: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        if let videoTrack = stream.videoTracks.first {
            DispatchQueue.main.async {
                self.remoteVideoTracks[stream.streamId] = videoTrack
            }
        }
    }
    
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        // Send ICE candidate to signaling server
        signalingService.send(iceCandidate: candidate)
    }
    
    // ... other delegate methods
}
```

### SwiftUI Video Renderer

```swift
import SwiftUI
import WebRTC

struct VideoView: UIViewRepresentable {
    let videoTrack: RTCVideoTrack
    
    func makeUIView(context: Context) -> RTCMTLVideoView {
        let view = RTCMTLVideoView()
        view.videoContentMode = .scaleAspectFill
        videoTrack.add(view)
        return view
    }
    
    func updateUIView(_ uiView: RTCMTLVideoView, context: Context) {
        // No updates needed
    }
    
    static func dismantleUIView(_ uiView: RTCMTLVideoView, coordinator: ()) {
        uiView.removeFromSuperview()
    }
}

struct MeetingRoomView: View {
    @ObservedObject var viewModel: MeetingViewModel
    
    var body: some View {
        ZStack {
            // Remote participants grid
            LazyVGrid(columns: gridColumns, spacing: 8) {
                ForEach(viewModel.remoteParticipants) { participant in
                    if let videoTrack = participant.videoTrack {
                        VideoView(videoTrack: videoTrack)
                            .aspectRatio(16/9, contentMode: .fit)
                            .cornerRadius(8)
                    }
                }
            }
            
            // Local video (picture-in-picture)
            VStack {
                HStack {
                    Spacer()
                    if let localTrack = viewModel.localVideoTrack {
                        VideoView(videoTrack: localTrack)
                            .frame(width: 120, height: 160)
                            .cornerRadius(8)
                            .padding()
                    }
                }
                Spacer()
            }
            
            // Controls
            VStack {
                Spacer()
                ControlsView(viewModel: viewModel)
                    .padding()
            }
        }
    }
}
```

### Push Notifications

```swift
import UserNotifications

class PushNotificationService: NSObject {
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }
    
    func handleRemoteNotification(_ userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else { return }
        
        switch type {
        case "meeting_invite":
            let meetingId = userInfo["meetingId"] as! String
            // Show in-app notification or navigate to meeting
            
        case "meeting_started":
            let meetingId = userInfo["meetingId"] as! String
            // Notify user that meeting has started
            
        default:
            break
        }
    }
}
```

---

## Android App

### Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Kotlin |
| UI Framework | Jetpack Compose |
| WebRTC | libwebrtc (org.webrtc:google-webrtc) |
| Networking | Retrofit + OkHttp |
| State | ViewModel + StateFlow |
| Persistence | Room / DataStore |
| Push | Firebase Cloud Messaging |

### Project Structure

```
ExitHostgMeet-Android/
├── app/src/main/java/com/exithostg/meet/
│   ├── MainActivity.kt
│   ├── ui/
│   │   ├── lobby/
│   │   │   └── LobbyScreen.kt
│   │   ├── meeting/
│   │   │   ├── MeetingScreen.kt
│   │   │   ├── ParticipantGrid.kt
│   │   │   └── Controls.kt
│   │   └── chat/
│   │       └── ChatScreen.kt
│   ├── viewmodel/
│   │   ├── MeetingViewModel.kt
│   │   └── ChatViewModel.kt
│   ├── model/
│   │   ├── Meeting.kt
│   │   ├── Participant.kt
│   │   └── Message.kt
│   ├── service/
│   │   ├── ApiService.kt
│   │   ├── WebRTCService.kt
│   │   ├── SignalingService.kt
│   │   └── PushService.kt
│   └── util/
│       └── Extensions.kt
└── app/src/main/res/
```

### WebRTC Integration

```kotlin
import org.webrtc.*

class WebRTCService(private val context: Context) {
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var videoCapturer: CameraVideoCapturer? = null
    
    private val _localVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val localVideoTrack: StateFlow<VideoTrack?> = _localVideoTrack
    
    private val _remoteVideoTracks = MutableStateFlow<Map<String, VideoTrack>>(emptyMap())
    val remoteVideoTracks: StateFlow<Map<String, VideoTrack>> = _remoteVideoTracks
    
    init {
        initializePeerConnectionFactory()
    }
    
    private fun initializePeerConnectionFactory() {
        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .createInitializationOptions()
        
        PeerConnectionFactory.initialize(options)
        
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(
                EglBase.create().eglBaseContext,
                true,
                true
            ))
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(
                EglBase.create().eglBaseContext
            ))
            .createPeerConnectionFactory()
    }
    
    fun startLocalVideo() {
        val videoSource = peerConnectionFactory!!.createVideoSource(false)
        
        videoCapturer = createCameraCapturer()
        videoCapturer?.initialize(
            SurfaceTextureHelper.create("CaptureThread", EglBase.create().eglBaseContext),
            context,
            videoSource.capturerObserver
        )
        
        videoCapturer?.startCapture(1280, 720, 30)
        
        val videoTrack = peerConnectionFactory!!.createVideoTrack("video0", videoSource)
        _localVideoTrack.value = videoTrack
    }
    
    private fun createCameraCapturer(): CameraVideoCapturer {
        val enumerator = Camera2Enumerator(context)
        
        for (deviceName in enumerator.deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
        }
        
        throw RuntimeException("No front camera found")
    }
    
    fun createPeerConnection(iceServers: List<PeerConnection.IceServer>) {
        val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }
        
        peerConnection = peerConnectionFactory!!.createPeerConnection(
            rtcConfig,
            object : PeerConnection.Observer {
                override fun onAddStream(stream: MediaStream) {
                    stream.videoTracks.firstOrNull()?.let { videoTrack ->
                        _remoteVideoTracks.value += (stream.id to videoTrack)
                    }
                }
                
                override fun onIceCandidate(candidate: IceCandidate) {
                    // Send to signaling server
                    signalingService.sendIceCandidate(candidate)
                }
                
                // ... other callbacks
            }
        )
        
        // Add local track
        localVideoTrack.value?.let {
            peerConnection?.addTrack(it, listOf("stream0"))
        }
    }
}
```

### Jetpack Compose UI

```kotlin
@Composable
fun MeetingScreen(viewModel: MeetingViewModel) {
    val remoteParticipants by viewModel.remoteParticipants.collectAsState()
    val localVideoTrack by viewModel.localVideoTrack.collectAsState()
    
    Box(modifier = Modifier.fillMaxSize()) {
        // Remote participants grid
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 150.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(remoteParticipants) { participant ->
                participant.videoTrack?.let { videoTrack ->
                    VideoView(
                        videoTrack = videoTrack,
                        modifier = Modifier
                            .aspectRatio(16f / 9f)
                            .padding(4.dp)
                            .clip(RoundedCornerShape(8.dp))
                    )
                }
            }
        }
        
        // Local video (PiP)
        localVideoTrack?.let { track ->
            VideoView(
                videoTrack = track,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .width(120.dp)
                    .height(160.dp)
                    .padding(16.dp)
                    .clip(RoundedCornerShape(8.dp))
            )
        }
        
        // Controls
        MeetingControls(
            viewModel = viewModel,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

@Composable
fun VideoView(videoTrack: VideoTrack, modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            SurfaceViewRenderer(context).apply {
                init(EglBase.create().eglBaseContext, null)
                videoTrack.addSink(this)
            }
        },
        modifier = modifier
    )
}
```

### Firebase Cloud Messaging

```kotlin
class PushService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"]
        
        when (type) {
            "meeting_invite" -> {
                val meetingId = message.data["meetingId"]
                showNotification("Meeting Invitation", "You have been invited to a meeting")
            }
            
            "meeting_started" -> {
                val meetingId = message.data["meetingId"]
                showNotification("Meeting Started", "Your meeting has started")
            }
        }
    }
    
    private fun showNotification(title: String, body: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .build()
        
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
    }
}
```

---

## Feature Parity

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| Join meeting | ✅ | ✅ | ✅ |
| Video/audio | ✅ | ✅ | ✅ |
| Screen share | ✅ (iOS 12+) | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Reactions | ✅ | ✅ | ✅ |
| Background audio | ✅ | ✅ | ❌ |
| Picture-in-Picture | ✅ | ✅ | ⚠️ (limited) |
| Push notifications | ✅ | ✅ | ⚠️ (limited) |

---

## Roadmap

### Phase 1 (Q3 2026)
- iOS app MVP (join, video, audio, chat)
- Android app MVP

### Phase 2 (Q4 2026)
- Screen sharing
- Background audio
- Picture-in-Picture

### Phase 3 (2027)
- Widgets (iOS/Android)
- CarPlay / Android Auto integration
- Offline mode (view recordings)
