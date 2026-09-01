import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Users, Settings, Power, PowerOff } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
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
import { twilioVoiceManager } from '@/lib/twilioVoice';

interface AudioChatProps {
  onNavigate: (screen: string) => void;
}

export const AudioChat: React.FC<AudioChatProps> = ({ onNavigate }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentMatchName, setCurrentMatchName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));
  const [activeMatches, setActiveMatches] = useState<CallableMatch[]>([]);

  // Pulled out of the effect so a failed attempt can be retried from the
  // "Retry" button below, not just on mount. initialize() itself now races
  // its session lookup against a timeout (see twilioVoice.ts), so this
  // always settles one way or the other instead of hanging - but it can
  // still fail outright (no session, Twilio misconfigured, etc.), and
  // previously that left the Call button stuck reading "Initializing..."
  // forever with nothing shown to the user.
  const initializeVoice = useCallback(async () => {
    if (!user?.id || isInitialized) return;

    setInitError(null);
    try {
      await twilioVoiceManager.initialize(user.id, {
        onIncoming: () => {
          // Consent already happened: this screen is only reached by accepting
          // the incoming-call modal, or by being on it deliberately. Nothing
          // used to call accept(), which is why every audio call died as
          // No Answer.
          twilioVoiceManager.acceptIncomingCall({
            onAnswered: () => {
              setIsInCall(true);
              setIsConnecting(false);
              setIsAnswered(true);
              setCallDuration(0);
            },
            onEnded: () => endCall(),
          });
        },
      });
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Twilio Voice:', error);
      setInitError(error instanceof Error ? error.message : 'Could not set up voice calling.');
    }
  }, [user?.id, isInitialized]);

  useEffect(() => {
    initializeVoice();

    return () => {
      // Unconditional: this cleanup closes over `isInitialized` from the render
      // the effect ran in, which is always false on mount - so guarding on it
      // meant destroy() never ran and the Twilio Device stayed registered
      // (holding the mic) after leaving the screen. destroy() no-ops when there
      // is no device.
      void twilioVoiceManager.destroy();
    };
  }, [user?.id]);

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

  // Arriving from a Call button on someone's profile. Captured on mount but
  // dialled only once the Twilio Device is ready - startAudioCall refuses while
  // isInitialized is false, so calling it immediately would just tell the user
  // to wait, which is exactly what they pressed the button to avoid.
  const pendingCallRef = useRef<{ peerId: string; peerName: string } | null>(null);
  useEffect(() => {
    pendingCallRef.current = takePendingCall();
  }, []);

  // Signalling state for an outgoing invite, mirroring VideoChat. Audio had
  // none of this: startAudioCall dialled Twilio directly, so the other person
  // was never told anything and their device was not registered to receive it.
  const inviteRef = useRef<CallInvite | null>(null);
  const unwatchInviteRef = useRef<(() => void) | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRingbackRef = useRef<(() => void) | null>(null);

  const clearSignalling = () => {
    unwatchInviteRef.current?.();
    unwatchInviteRef.current = null;
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    stopRingbackRef.current?.();
    stopRingbackRef.current = null;
  };

  // Arriving because the incoming-call modal was accepted. The caller is
  // waiting on 'accepted' before dialling, so all this side has to do is be
  // registered and pick up when Twilio delivers the call.
  const acceptedCallRef = useRef(takeAcceptedCall());
  useEffect(() => {
    const accepted = acceptedCallRef.current;
    if (accepted) {
      setCurrentMatchName(accepted.peerName);
      setIsConnecting(true);
    }
  }, []);

  useEffect(() => clearSignalling, []);

  useEffect(() => {
    const target = pendingCallRef.current;
    if (!target || !isInitialized || !user?.id) return;
    pendingCallRef.current = null;
    void startAudioCall(target.peerId, target.peerName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, user?.id]);

  const startAudioCall = async (matchId: string, matchName: string) => {
    if (!user) {
      alert('Please sign in to make audio calls');
      return;
    }

    if (!isInitialized) {
      alert('Audio system is initializing. Please wait a moment.');
      return;
    }

    const canAfford = creditManager.canAfford(user.id, 50);
    if (!canAfford && !(await creditManager.hasFreeCallingAccess(user.id))) {
      alert(`Need ${formatCredits(50)} per minute for audio calls!`);
      return;
    }

    try {
      setIsConnecting(true);
      setCurrentMatchName(matchName);

      // Billing starts on answer, not on dial. device.connect() resolves as
      // soon as the call is placed, so the meter used to run while the other
      // phone was still ringing - and charged in full for calls nobody picked
      // up. Matches what VideoChat does with its remote-participant event.
      const beginBilling = () => {
        if ((window as any).callTimer) return;
        setIsAnswered(true);
        setCallDuration(0);

        const timer = setInterval(() => {
          setCallDuration(prev => {
            const newDuration = prev + 1;
            if (newDuration % 60 === 0) {
              void (async () => {
                const success = await creditManager.deductCredits(user.id, 50);
                if (success) {
                  setUserBalance(creditManager.getTotalCredits(user.id));
                } else if (!(await creditManager.hasFreeCallingAccess(user.id))) {
                  endCall();
                  alert('Insufficient credits for audio call!');
                }
              })();
            }
            return newDuration;
          });
        }, 1000);
        (window as any).callTimer = timer;
      };

      // Ring them first, and only dial once they have accepted.
      //
      // Twilio Voice delivers a call to a *registered* device. The callee's
      // device only registers when this screen is open, so dialling straight
      // away reached nobody - the Twilio log showed these ending as No Answer
      // after 0 seconds. Now the invite rings them app-wide, accepting brings
      // them here, and their device is registering while we wait.
      const invite = await ringUser(matchId, 'audio');
      inviteRef.current = invite;

      // Pressing Call is the user gesture that lets this side play sound.
      stopRingbackRef.current = startRingtone('outgoing');

      const dial = async () => {
        clearSignalling();
        try {
          await twilioVoiceManager.makeCall(matchId, {
            onAnswered: beginBilling,
            onEnded: () => endCall(),
          });
          setIsInCall(true);
          setIsConnecting(false);
          setCallDuration(0);
        } catch (dialError) {
          console.error('Audio dial failed after accept:', dialError);
          setIsConnecting(false);
          alert('They answered, but the call could not connect. Please try again.');
        }
      };

      unwatchInviteRef.current = watchInvite(invite.id, (status) => {
        if (status === 'accepted') {
          // A moment for their device to finish registering before Twilio
          // tries to reach it.
          setTimeout(() => { void dial(); }, 1500);
          return;
        }
        clearSignalling();
        inviteRef.current = null;
        setIsConnecting(false);
        alert(
          status === 'declined'
            ? `${matchName} declined the call.`
            : `The call to ${matchName} ended before it connected.`
        );
      });

      ringTimeoutRef.current = setTimeout(() => {
        clearSignalling();
        if (inviteRef.current) {
          void resolveInvite(inviteRef.current.id, 'missed');
          inviteRef.current = null;
        }
        setIsConnecting(false);
        alert(`${matchName} did not answer.`);
      }, RING_TIMEOUT_MS);

    } catch (error: any) {
      console.error('Error starting audio call:', error);
      setIsConnecting(false);
      const errorText = error.message || 'Failed to start audio call. Please try again.';

      if (errorText.includes('credentials not configured')) {
        alert('Twilio Not Configured\n\nThe calling system needs to be configured by an administrator. Please check TWILIO_TROUBLESHOOTING.md or contact support.');
      } else if (errorText.includes('Not authenticated')) {
        alert('Please sign in to make audio calls.');
      } else {
        alert(errorText);
      }
    }
  };

  const endCall = () => {
    clearSignalling();
    if (inviteRef.current) {
      void resolveInvite(inviteRef.current.id, 'cancelled');
      inviteRef.current = null;
    }
    twilioVoiceManager.endCall();
    setIsInCall(false);
    setIsConnecting(false);
    setIsAnswered(false);
    if ((window as any).callTimer) {
      clearInterval((window as any).callTimer);
      (window as any).callTimer = null;
    }
  };

  const handleToggleMic = () => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    twilioVoiceManager.toggleMute(!newState);
  };

  if (isInCall) {
    return (
      <Layout
      showFooter={false}
        title="Voice Call"
        onBack={endCall}
        showClose={false}
      >
        <div className="h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 relative flex flex-col items-center justify-center">
          {/* Call Info */}
          <div className="text-center mb-12">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center border-4 border-white/30">
              <Phone className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{currentMatchName}</h2>
            <p className="text-white/80 text-lg">{Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</p>
            {isConnecting ? (
              <p className="text-white/60 text-sm mt-2">Connecting...</p>
            ) : isAnswered ? (
              <p className="text-white/60 text-sm mt-2">Voice call in progress...</p>
            ) : (
              <>
                <p className="text-white/60 text-sm mt-2">Ringing…</p>
                <p className="text-white/50 text-xs mt-1">
                  You are not charged until they answer.
                </p>
              </>
            )}
            <p className="text-white/60 text-sm mt-1">{formatCredits(userBalance)} remaining</p>
          </div>

          {/* Audio Visualizer */}
          <div className="flex items-center space-x-2 mb-12">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/60 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 40 + 20}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>

          {/* Call Controls */}
          <div className="flex items-center justify-center space-x-4">
            {/* Audio Enable/Disable */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                audioEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
              title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
            >
              {audioEnabled ? (
                <Power className="w-6 h-6 text-white" />
              ) : (
                <PowerOff className="w-6 h-6 text-white" />
              )}
            </button>

            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                isSpeakerOn ? 'bg-white/30' : 'bg-white/10'
              }`}
              disabled={!audioEnabled}
              title={isSpeakerOn ? 'Turn off Speaker' : 'Turn on Speaker'}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-5 h-5 text-white" />
              ) : (
                <VolumeX className="w-5 h-5 text-white" />
              )}
            </button>

            <button
              onClick={handleToggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                isMicOn ? 'bg-white/10' : 'bg-red-500'
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
              className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-300"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5 text-white" />
            </button>

            {/* Audio Settings */}
            <button
              onClick={() => setShowAudioSettings(!showAudioSettings)}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 bg-white/10 hover:bg-white/20"
              title="Audio Settings"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Audio Settings Panel */}
          {showAudioSettings && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-2xl p-4 text-white">
              <h3 className="font-semibold mb-3">Audio Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Audio Quality</span>
                  <select className="bg-white/20 rounded px-2 py-1 text-sm">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Noise Cancellation</span>
                  <button 
                    onClick={() => {}}
                    className="w-8 h-4 bg-green-500 rounded-full relative"
                  >
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
      title="Audio Chat"
      onBack={() => onNavigate('discovery')}
      showClose={false}
    >
      <div className="px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400" 
            alt="Audio Chat" 
            className="w-20 h-20 mx-auto mb-4 rounded-full object-cover shadow-lg"
          />
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
            <Phone className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Audio Chat</h2>
          <p className="text-white/80">Have intimate voice conversations</p>
        </div>

        {/* Online Matches */}
        <div className="mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Available for Voice Chat</h3>
          
          {/* Audio System Controls */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Audio System Controls
            </h4>
            <div className="grid grid-cols-2 gap-3">
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
              
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                disabled={!audioEnabled}
                className={`flex items-center justify-center p-3 rounded-xl transition-all duration-300 disabled:opacity-50 ${
                  isMicOn && audioEnabled
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {isMicOn ? (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Mic ON
                  </>
                ) : (
                  <>
                    <MicOff className="w-5 h-5 mr-2" />
                    Mic OFF
                  </>
                )}
              </button>
            </div>
            
            {!audioEnabled && (
              <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg">
                <p className="text-yellow-200 text-sm flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Audio system is disabled. Enable to start voice calls.
                </p>
              </div>
            )}
          </div>
          
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
                    onClick={() => {
                      if (initError) {
                        initializeVoice();
                        return;
                      }
                      startAudioCall(match.id, match.name);
                    }}
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 hover:scale-105 transition-all duration-300"
                    type="button"
                    title={initError || undefined}
                    disabled={match.status !== 'online' || !audioEnabled || (!isInitialized && !initError) || isConnecting}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {initError ? 'Retry' : !isInitialized ? 'Initializing...' : audioEnabled ? 'Call' : 'Audio Disabled'}
                  </Button>
                  <div className="flex space-x-2 ml-2">
                    <Button
                      onClick={() => {
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                        successMessage.textContent = `✅ Accepted call from ${match.name}`;
                        document.body.appendChild(successMessage);
                        setTimeout(() => document.body.removeChild(successMessage), 3000);
                        startAudioCall(match.id, match.name);
                      }}
                      className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
                      disabled={match.status !== 'online' || !isInitialized || isConnecting}
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
          <h3 className="text-white font-semibold text-lg mb-4">Voice Chat Benefits</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Crystal Clear Audio</p>
                <p className="text-white/70 text-sm">High-quality voice calls</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Private & Secure</p>
                <p className="text-white/70 text-sm">End-to-end encrypted calls</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};