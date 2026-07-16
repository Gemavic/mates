import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Users, Settings, Power, PowerOff } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase';
import { twilioVoiceManager } from '@/lib/twilioVoice';

interface ActiveMatch {
  id: string;
  name: string;
  image: string;
  status: string;
}

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
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);

  useEffect(() => {
    const initializeVoice = async () => {
      if (!user?.id || isInitialized) return;

      try {
        await twilioVoiceManager.initialize(user.id);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Twilio Voice:', error);
      }
    };

    initializeVoice();

    return () => {
      if (isInitialized) {
        twilioVoiceManager.destroy();
      }
    };
  }, [user?.id]);

  useEffect(() => {
    const loadMatches = async () => {
      if (!user?.id) return;

      try {
        const { data: profiles } = await supabaseClient
          .from('user_profiles')
          .select('user_id, first_name, full_name, is_online')
          .neq('user_id', user.id)
          .eq('profile_visibility', 'public')
          .limit(5);

        if (profiles && profiles.length > 0) {
          const matches = await Promise.all(
            profiles.map(async (profile: any) => {
              const { data: photo } = await supabaseClient
                .from('user_photos')
                .select('photo_url')
                .eq('user_id', profile.user_id)
                .eq('is_primary', true)
                .maybeSingle();

              return {
                id: profile.user_id,
                name: profile.first_name || profile.full_name || 'User',
                image: photo?.photo_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400',
                status: profile.is_online ? 'online' : 'offline'
              };
            })
          );
          setActiveMatches(matches);
        }
      } catch (error) {
        console.error('Error loading matches:', error);
      }
    };

    loadMatches();
  }, [user?.id]);

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
    if (!canAfford && !creditManager.isStaffMember(user.id)) {
      alert(`Need ${formatCredits(50)} per minute for audio calls!`);
      return;
    }

    try {
      setIsConnecting(true);
      setCurrentMatchName(matchName);

      await twilioVoiceManager.makeCall(matchId);

      setIsInCall(true);
      setIsConnecting(false);
      setCallDuration(0);

      const timer = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration % 60 === 0) {
            void (async () => {
              const success = await creditManager.deductCredits(user.id, 50);
              if (success) {
                setUserBalance(creditManager.getTotalCredits(user.id));
              } else if (!creditManager.isStaffMember(user.id)) {
                endCall();
                alert('Insufficient credits for audio call!');
              }
            })();
          }
          return newDuration;
        });
      }, 1000);
      (window as any).callTimer = timer;

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
    twilioVoiceManager.endCall();
    setIsInCall(false);
    setIsConnecting(false);
    if ((window as any).callTimer) {
      clearInterval((window as any).callTimer);
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
            ) : (
              <p className="text-white/60 text-sm mt-2">Voice call in progress...</p>
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
                        match.status === 'online' ? 'bg-green-500' : 
                        match.status === 'busy' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{match.name}</h4>
                      <p className="text-white/70 text-sm capitalize">{match.status}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => startAudioCall(match.id, match.name)}
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 hover:scale-105 transition-all duration-300"
                    type="button"
                    disabled={match.status !== 'online' || !audioEnabled || !isInitialized || isConnecting}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {!isInitialized ? 'Initializing...' : audioEnabled ? 'Call' : 'Audio Disabled'}
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