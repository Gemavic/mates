import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Settings, Power, PowerOff, Monitor, MonitorOff } from 'lucide-react';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { showCallToast } from '@/lib/callToast';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { loadCallableMatches, type CallableMatch } from '@/lib/callMatches';
import {
  RING_TIMEOUT_MS,
  resolveInvite,
  ringUser,
  takeAcceptedCall,
  takePendingCall,
  watchInvite,
  type CallInvite,
} from '@/lib/callSignals';
import { startRingtone } from '@/lib/ringtone';
import { twilioVideoManager } from '@/lib/twilioVideo';
import type {
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteParticipant,
  RemoteTrack,
  RemoteVideoTrack,
} from 'twilio-video';

interface VideoChatProps {
  onNavigate: (screen: string) => void;
}

export const VideoChat: React.FC<VideoChatProps> = ({ onNavigate }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentMatchName, setCurrentMatchName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptData, setUpgradePromptData] = useState<any>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const { user } = useAuth();
  const { checkAccess, recordUpgradePrompt, daysRemaining } = useSubscription();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));
  const [activeMatches, setActiveMatches] = useState<CallableMatch[]>([]);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  // Tracks arrive before the in-call view is rendered, so hold them here and
  // attach once the containers exist (see the effect below).
  const localTrackRef = useRef<LocalVideoTrack | null>(null);
  const pendingRemoteTracks = useRef<RemoteVideoTrack[]>([]);
  // Signalling state for the outgoing invite.
  const inviteRef = useRef<CallInvite | null>(null);
  const unwatchInviteRef = useRef<(() => void) | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRingbackRef = useRef<(() => void) | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  // The self-view tile takes its shape from the camera, not the other way
  // round. A fixed portrait box against a landscape webcam is what left a
  // grey band under the picture.
  const [localAspect, setLocalAspect] = useState('3 / 4');

  // Remote audio needs somewhere to live. The in-call view only renders video
  // containers, and it does not exist at all until a call starts - so a track
  // that arrived early had nowhere to go. This container is created once, sits
  // outside the React tree and outlives every branch, so audio can attach the
  // moment it is subscribed.
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const host = document.createElement('div');
    host.style.display = 'none';
    host.setAttribute('data-dc-remote-audio', '');
    document.body.appendChild(host);
    remoteAudioRef.current = host;
    return () => {
      host.remove();
      remoteAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const loadMatches = async () => {
      if (!user?.id) return;
      try {
        setActiveMatches(await loadCallableMatches(user.id));
      } catch (error) {
        console.error('Error loading matches:', error);
      }
    };

    loadMatches();
  }, [user?.id]);

  // Arriving here from an accepted incoming call: join the room the caller is
  // already waiting in, instead of starting a fresh outgoing call.
  useEffect(() => {
    // Arriving from a Call button on someone's profile: dial them straight
    // away rather than dropping the user on a list containing the person they
    // were already looking at.
    const outgoing = takePendingCall();
    if (outgoing && user?.id) {
      isCallerRef.current = true;
      void startVideoCall(outgoing.peerId, outgoing.peerName);
      return;
    }

    const accepted = takeAcceptedCall();
    if (!accepted || !user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        setIsConnecting(true);
        isCallerRef.current = false;
        setCurrentMatchName(accepted.peerName);
        await joinCallRoom(accepted.roomName, user.id);
        if (cancelled) return;
        setIsInCall(true);
        setIsConnecting(false);
      } catch (error: any) {
        if (cancelled) return;
        console.error('Error joining accepted call:', error);
        twilioVideoManager.leaveRoom();
        localTrackRef.current = null;
        setIsConnecting(false);
        setCallError(error?.message || 'Could not join the call.');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once on mount; takeAcceptedCall() is read-once by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Attach video once the in-call view is on screen. Both containers live
  // inside the `isInCall` branch, so nothing can be attached until this runs.
  useEffect(() => {
    if (!isInCall) return;

    let localEl: HTMLVideoElement | null = null;
    let onMeta: (() => void) | null = null;

    if (localVideoRef.current && localTrackRef.current) {
      localVideoRef.current.replaceChildren();
      const el = twilioVideoManager.attachTrack(
        localTrackRef.current,
        localVideoRef.current,
        'cover'
      );
      if (el instanceof HTMLVideoElement) {
        localEl = el;
        // Never play our own audio back at us.
        el.muted = true;
        onMeta = () => {
          if (el.videoWidth && el.videoHeight) {
            setLocalAspect(`${el.videoWidth} / ${el.videoHeight}`);
          }
        };
        if (el.readyState >= 1) onMeta();
        el.addEventListener('loadedmetadata', onMeta);
      }
    }

    if (remoteVideoRef.current && pendingRemoteTracks.current.length) {
      for (const track of pendingRemoteTracks.current) {
        // The other person is never cropped: fit the whole frame inside the
        // screen rather than filling it.
        twilioVideoManager.attachTrack(track, remoteVideoRef.current, 'contain');
      }
      pendingRemoteTracks.current = [];
    }

    return () => {
      if (localEl && onMeta) localEl.removeEventListener('loadedmetadata', onMeta);
    };
  }, [isInCall]);

  // Release the camera and mic if the screen is left while a call (or a failed
  // attempt) still holds them. Without this, navigating away mid-call leaves the
  // camera light on until the tab is closed.
  useEffect(() => {
    return () => {
      // Leaving the screen mid-ring must also stop the other phone ringing.
      if (inviteRef.current) {
        void resolveInvite(inviteRef.current.id, 'cancelled');
        inviteRef.current = null;
      }
      clearSignalling();
      twilioVideoManager.leaveRoom();
      if ((window as any).callTimer) {
        clearInterval((window as any).callTimer);
        (window as any).callTimer = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSignalling = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (unwatchInviteRef.current) {
      unwatchInviteRef.current();
      unwatchInviteRef.current = null;
    }
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
  };

  /**
   * True only on the side that placed the call. joinCallRoom() is shared by the
   * caller and the person accepting, and it started the meter for whoever ran
   * it - so both people were charged 60 credits a minute for the same call, and
   * a receiver who ran out was hung up on mid-conversation for a call they
   * never agreed to pay for. Audio never had this: its meter lives inside
   * startAudioCall, which only the caller runs.
   */
  const isCallerRef = useRef(false);

  /** So the low-credit warning is given once per call, not every minute. */
  const lowBalanceWarnedRef = useRef(false);

  /**
   * The clock and the meter are two different things, and conflating them was a
   * bug: when billing became caller-only, the receiver stopped being charged
   * *and* stopped seeing a timer, so their call sat at 00:00 for its whole
   * duration. Both sides always run the clock. Only the caller is charged.
   *
   * Either way it starts when the other person actually arrives, not when we
   * join the room - otherwise an unanswered call bills for an empty room.
   */
  const startCallClock = (userId: string, charge: boolean) => {
    if ((window as any).callTimer) return;
    lowBalanceWarnedRef.current = false;
    setCallDuration(0);

    const timer = setInterval(() => {
      setCallDuration((prev) => {
        const newDuration = prev + 1;
        if (charge && newDuration % 60 === 0) {
          void (async () => {
            const success = await creditManager.deductCredits(userId, 60);
            if (success) {
              const remaining = creditManager.getTotalCredits(userId);
              setUserBalance(remaining);

              // Say so before the money runs out, not as the call dies. Below
              // two more minutes there is time to wrap up or top up.
              if (!lowBalanceWarnedRef.current && remaining < 60 * 2) {
                lowBalanceWarnedRef.current = true;
                showCallToast(
                  `About ${Math.max(1, Math.floor(remaining / 60))} more minute(s) of credit. The call will end when it runs out.`
                );
              }
            } else if (!(await creditManager.hasFreeCallingAccess(userId))) {
              endCall();
              const errorMessage = document.createElement('div');
              errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
              errorMessage.textContent = 'Insufficient credits for video call!';
              document.body.appendChild(errorMessage);
              setTimeout(() => document.body.removeChild(errorMessage), 3000);
            }
          })();
        }
        return newDuration;
      });
    }, 1000);

    (window as any).callTimer = timer;
  };

  const joinCallRoom = async (roomName: string, userId: string) => {
    const localVideo = await twilioVideoManager.startLocalVideo();
    await twilioVideoManager.startLocalAudio();

    // Do NOT attach here: localVideoRef lives inside the `isInCall` branch,
    // which has not rendered yet, so ref.current is null and the preview was
    // silently never attached. The effect below attaches once it exists.
    localTrackRef.current = localVideo;
    pendingRemoteTracks.current = [];

    await twilioVideoManager.joinRoom(
      roomName,
      userId,
      (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        // They answered and arrived: stop ringing, start the meter.
        clearSignalling();
        setPeerConnected(true);
        // Both sides see the timer; only the caller pays for it.
        startCallClock(userId, isCallerRef.current);
      },
      (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        setPeerConnected(false);
      },
      (track: RemoteTrack, _participant: RemoteParticipant) => {
        // Audio first, and this used to be missing entirely: the handler began
        // `if (track.kind !== 'video') return`, so the other person's voice was
        // subscribed and then thrown away. Video worked, the call was silent.
        if (track.kind === 'audio') {
          if (!remoteAudioRef.current) return;
          const element = twilioVideoManager.attachTrack(
            track as RemoteAudioTrack,
            remoteAudioRef.current
          ) as HTMLAudioElement;
          element.autoplay = true;
          // Answering or placing the call is the user gesture that permits
          // playback; if a browser still refuses, there is nothing to undo.
          void element.play?.().catch(() => {});
          return;
        }
        if (track.kind !== 'video') return;
        const videoTrack = track as RemoteVideoTrack;
        if (remoteVideoRef.current) {
          twilioVideoManager.attachTrack(videoTrack, remoteVideoRef.current, 'contain');
        } else {
          // Anyone already in the room publishes during joinRoom(), i.e.
          // before the in-call view renders. Queue them instead of dropping.
          pendingRemoteTracks.current.push(videoTrack);
        }
      }
    );
  };

  const startVideoCall = async (matchId: string, matchName: string) => {
    if (!user) {
      alert('Please sign in to make video calls');
      return;
    }

    const accessResult = await checkAccess('video_call');
    if (!accessResult.allowed) {
      setUpgradePromptData(accessResult);
      setShowUpgradePrompt(true);
      await recordUpgradePrompt();
      return;
    }

    const canAfford = creditManager.canAfford(user.id, 60);
    if (!canAfford && !(await creditManager.hasFreeCallingAccess(user.id))) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = `Need ${formatCredits(60)} per minute for video calls!`;
      document.body.appendChild(errorMessage);
      setTimeout(() => document.body.removeChild(errorMessage), 3000);
      return;
    }

    try {
      setIsConnecting(true);
      isCallerRef.current = true;
      setCallError(null);
      setCurrentMatchName(matchName);

      // Ring them first. Without this the callee is never told anything and the
      // caller just sits alone in a room the other side never opens.
      const invite = await ringUser(matchId, 'video');
      inviteRef.current = invite;

      // Ringback for the caller. Pressing Call is the user gesture that lets
      // the browser start audio, so this side always sounds.
      stopRingbackRef.current = startRingtone('outgoing');

      unwatchInviteRef.current = watchInvite(invite.id, (status) => {
        if (status === 'accepted') return; // they will appear as a participant
        clearSignalling();
        inviteRef.current = null;
        setCallError(
          status === 'declined'
            ? `${matchName} declined the call.`
            : `${matchName} is not available right now.`
        );
        endCall();
      });

      ringTimeoutRef.current = setTimeout(() => {
        void resolveInvite(invite.id, 'missed');
        inviteRef.current = null;
        setCallError(`${matchName} did not answer.`);
        endCall();
      }, RING_TIMEOUT_MS);

      await joinCallRoom(invite.room_name, user.id);

      setIsInCall(true);
      setIsConnecting(false);

    } catch (error: any) {
      console.error('Error starting video call:', error);
      setIsConnecting(false);

      // If we already rang before failing, withdraw it. Otherwise the ringback
      // plays on, the timeout stays armed, and - worst of all - the other
      // person's phone keeps ringing for a call that no longer exists.
      if (inviteRef.current) {
        void resolveInvite(inviteRef.current.id, 'cancelled');
        inviteRef.current = null;
      }
      clearSignalling();

      // The camera and mic are acquired above, before the room is joined. If
      // joining then fails we must hand them back - otherwise the camera light
      // stays on after a failed call, and a retry acquires a second track on
      // top of the orphaned one.
      twilioVideoManager.leaveRoom();
      localTrackRef.current = null;
      pendingRemoteTracks.current = [];

      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md';
      const errorText = error.message || 'Failed to start video call. Please try again.';

      // Also keep the reason on screen after the toast auto-dismisses, so the
      // user is not left with a Call button that silently did nothing.
      setCallError(
        errorText.includes('credentials not configured')
          ? 'Video calling is not configured yet. Please contact support.'
          : errorText
      );

      if (errorText.includes('credentials not configured')) {
        errorMessage.innerHTML = `<strong>Twilio Not Configured</strong><br><small>Please check TWILIO_TROUBLESHOOTING.md or contact support.</small>`;
      } else if (errorText.includes('Not authenticated')) {
        errorMessage.textContent = 'Please sign in to make video calls.';
      } else {
        errorMessage.textContent = errorText;
      }

      document.body.appendChild(errorMessage);
      setTimeout(() => {
        if (errorMessage.parentNode) {
          document.body.removeChild(errorMessage);
        }
      }, 5000);
    }
  };

  const endCall = () => {
    // Hanging up while it is still ringing must stop the other phone ringing.
    if (inviteRef.current) {
      void resolveInvite(inviteRef.current.id, 'cancelled');
      inviteRef.current = null;
    }
    clearSignalling();

    twilioVideoManager.leaveRoom();
    localTrackRef.current = null;
    pendingRemoteTracks.current = [];
    setPeerConnected(false);
    setIsInCall(false);
    setIsConnecting(false);
    if ((window as any).callTimer) {
      clearInterval((window as any).callTimer);
      (window as any).callTimer = null;
    }
  };

  const handleToggleVideo = () => {
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    twilioVideoManager.toggleVideo(newState);
  };

  const handleToggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    twilioVideoManager.toggleAudio(newState);
  };

  if (isInCall) {
    return (
      <Layout
      showFooter={false}
        title="Video Call"
        onBack={endCall}
        showClose={false}
      >
        <div className="h-screen bg-black relative">
          {/* Remote Video */}
          <div className="absolute inset-0 bg-gray-900">
            <div ref={remoteVideoRef} className="w-full h-full" />
            {(isConnecting || !peerConnected) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                  <p>
                    {isConnecting
                      ? `Connecting to ${currentMatchName}...`
                      : `Ringing ${currentMatchName}...`}
                  </p>
                  {!isConnecting && (
                    <p className="mt-2 text-sm text-white/70">
                      Waiting for them to answer — you are not charged until they do.
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentMatchName}
              {peerConnected
                ? ` • ${Math.floor(callDuration / 60).toString().padStart(2, '0')}:${(callDuration % 60).toString().padStart(2, '0')}`
                : ' • ringing'}
            </div>
            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {formatCredits(userBalance)} remaining
            </div>
          </div>

          {/* Local Video */}
          <div
            className="absolute top-20 right-4 w-32 sm:w-40 bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20"
            style={{ aspectRatio: localAspect }}
          >
            <div ref={localVideoRef} className="w-full h-full" />
            {!isVideoOn && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-white/50" />
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              {/* Video System Control */}
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  videoEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
                title={videoEnabled ? 'Disable Video System' : 'Enable Video System'}
              >
                {videoEnabled ? (
                  <Monitor className="w-5 h-5 text-white" />
                ) : (
                  <MonitorOff className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Audio System Control */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  audioEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
                title={audioEnabled ? 'Disable Audio System' : 'Enable Audio System'}
              >
                {audioEnabled ? (
                  <Power className="w-5 h-5 text-white" />
                ) : (
                  <PowerOff className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isVideoOn ? 'bg-white/20' : 'bg-red-500'
                }`}
                disabled={!videoEnabled}
                title={isVideoOn ? 'Turn off Camera' : 'Turn on Camera'}
              >
                {isVideoOn ? (
                  <Video className="w-5 h-5 text-white" />
                ) : (
                  <VideoOff className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={handleToggleMic}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isMicOn ? 'bg-white/20' : 'bg-red-500'
                }`}
                disabled={!audioEnabled}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? (
                  <Mic className="w-5 h-5 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={endCall}
                className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-all duration-300"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>

              <button 
                onClick={() => setShowVideoSettings(!showVideoSettings)}
                className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300"
                title="Video Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* System Status */}
            <div className="mt-3 flex items-center justify-center space-x-4 text-xs text-white/80">
              <span className={audioEnabled ? 'text-green-400' : 'text-red-400'}>
                Audio: {audioEnabled ? 'ON' : 'OFF'}
              </span>
              <span className={videoEnabled ? 'text-green-400' : 'text-red-400'}>
                Video: {videoEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Video Settings Panel */}
          {showVideoSettings && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-2xl p-4 text-white">
              <h3 className="font-semibold mb-3">Video Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Video Quality</span>
                  <select className="bg-white/20 rounded px-2 py-1 text-sm">
                    <option value="1080p">1080p HD</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto Focus</span>
                  <button className="w-8 h-4 bg-green-500 rounded-full relative">
                    <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      showFooter={false}
      title="Video Chat"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=400" 
            alt="Video Chat" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover shadow-lg"
          />
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Video Chat</h2>
          <p className="text-white/80">Connect face-to-face with your matches</p>
        </div>

        {/* Online Matches */}
        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Available for Video Chat</h3>
          
          {/* Video/Audio System Controls */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              System Controls
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${
                  videoEnabled 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {videoEnabled ? (
                  <>
                    <Monitor className="w-5 h-5 mr-2" />
                    Video ON
                  </>
                ) : (
                  <>
                    <MonitorOff className="w-5 h-5 mr-2" />
                    Video OFF
                  </>
                )}
              </button>
              
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${
                  audioEnabled 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {audioEnabled ? (
                  <>
                    <Power className="w-5 h-5 mr-2" />
                    Audio ON
                  </>
                ) : (
                  <>
                    <PowerOff className="w-5 h-5 mr-2" />
                    Audio OFF
                  </>
                )}
              </button>
            </div>
            
            {(!videoEnabled || !audioEnabled) && (
              <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg">
                <p className="text-yellow-200 text-sm flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  {!videoEnabled && !audioEnabled ? 'Video and Audio systems are disabled.' :
                   !videoEnabled ? 'Video system is disabled.' : 'Audio system is disabled.'}
                </p>
              </div>
            )}
          </div>
          
          {callError && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-red-400/40 bg-red-500/20 p-4">
              <p className="text-sm text-white">{callError}</p>
              <button
                type="button"
                onClick={() => setCallError(null)}
                className="shrink-0 text-sm font-medium text-white/80 underline hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-3">
            {activeMatches.map((match) => (
              <div
                key={match.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={match.image}
                        alt={match.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                        match.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{match.name}</h4>
                      <p className="text-white/70 text-sm capitalize">{match.status}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startVideoCall(match.id, match.name);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 hover:scale-105 transition-all duration-300"
                    disabled={match.status !== 'online' || !videoEnabled || !audioEnabled || isConnecting}
                    type="button"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {(!videoEnabled || !audioEnabled) ? 'System Disabled' : 'Call'}
                  </Button>
                  <div className="flex space-x-2 ml-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                        successMessage.textContent = `✅ Accepted call from ${match.name}`;
                        document.body.appendChild(successMessage);
                        setTimeout(() => document.body.removeChild(successMessage), 3000);
                        startVideoCall(match.id, match.name);
                      }}
                      className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
                      disabled={match.status !== 'online' || isConnecting}
                      type="button"
                      title="Accept call"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </Button>
                    <Button
                      onClick={() => {
                        const declineMessage = document.createElement('div');
                        declineMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                        declineMessage.textContent = `❌ Declined call from ${match.name}`;
                        document.body.appendChild(declineMessage);
                        setTimeout(() => document.body.removeChild(declineMessage), 3000);
                      }}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      title="Decline call"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <h3 className="text-white font-semibold text-lg mb-4">Video Chat Features</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">HD Video Quality</p>
                <p className="text-white/70 text-sm">Crystal clear video calls</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Safe Environment</p>
                <p className="text-white/70 text-sm">Secure and private calls</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUpgradePrompt && upgradePromptData && (
        <UpgradePrompt
          reason={upgradePromptData.reason || 'Upgrade to access video calls'}
          feature={upgradePromptData.feature}
          currentTier={upgradePromptData.current_tier}
          gracePeriodExpired={upgradePromptData.grace_period_expired}
          daysRemaining={daysRemaining}
          onUpgrade={() => {
            setShowUpgradePrompt(false);
            onNavigate('credits');
          }}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </Layout>
  );
};