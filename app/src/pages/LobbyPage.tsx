import { useState, useEffect } from 'react';
import { Mic, Video, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMeeting, useToast } from '@/contexts';
import { useWebRTC } from '@/hooks';
import { copyToClipboard } from '@/utils';

export function LobbyPage() {
  const { currentMeeting, joinMeeting, isHost, setLocalStream } = useMeeting();
  const { success, error } = useToast();
  const [displayName, setDisplayName] = useState('You');
  const [isJoining, setIsJoining] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { stream, isLoading, error: webrtcError } = useWebRTC({
    enabled: true,
    audioEnabled: true,
    videoEnabled: true,
  });

  useEffect(() => {
    if (stream) {
      setLocalStream(stream);
    }
  }, [stream, setLocalStream]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      if (currentMeeting) {
        await joinMeeting(currentMeeting.code);
      }
    } catch (err) {
      error('Failed to join meeting');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyLink = async () => {
    if (currentMeeting) {
      const link = `${window.location.origin}/meet/${currentMeeting.code}`;
      if (await copyToClipboard(link)) {
        setIsCopied(true);
        success('Meeting link copied');
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handleCopyCode = async () => {
    if (currentMeeting) {
      const formatted = `${currentMeeting.code.slice(0, 3)}-${currentMeeting.code.slice(3, 6)}-${currentMeeting.code.slice(6, 9)}`;
      if (await copyToClipboard(formatted)) {
        setIsCopied(true);
        success('Meeting code copied');
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  if (!currentMeeting) return null;

  const formattedCode = `${currentMeeting.code.slice(0, 3)}-${currentMeeting.code.slice(3, 6)}-${currentMeeting.code.slice(6, 9)}`;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Ready to join?</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyCode} className="px-4 py-2 bg-gray-800 rounded-lg text-white text-sm hover:bg-gray-700 transition-colors">
            {isCopied ? 'Copied!' : formattedCode}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
          <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden">
            {stream ? (
              <video autoPlay playsInline muted className="w-full h-full object-cover" ref={(el) => { if (el) el.srcObject = stream; }} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-semibold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <button className="p-3 rounded-full bg-gray-900/80 text-white hover:bg-gray-900 transition-colors">
                <Mic className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-full bg-gray-900/80 text-white hover:bg-gray-900 transition-colors">
                <Video className="h-5 w-5" />
              </button>
              <button className="p-3 rounded-full bg-gray-900/80 text-white hover:bg-gray-900 transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your display name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Meeting code</label>
              <div className="flex gap-2">
                <Input value={formattedCode} readOnly className="bg-gray-800 border-gray-700 text-white" />
                <Button variant="outline" onClick={handleCopyLink}>Copy link</Button>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleJoin}
              disabled={isJoining || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isJoining ? 'Joining...' : isHost ? 'Start meeting' : 'Join meeting'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {webrtcError && (
              <p className="text-red-400 text-sm">Camera/microphone access denied. Check your permissions.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
