import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff, Phone, Camera, Users, Settings, Power, PowerOff, Monitor, MonitorOff } from 'lucide-react';
import { creditManager, formatCredits } from '@/lib/creditSystem';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState(creditManager.getTotalCredits(user?.id || 'demo-user'));

  const activeMatches = [
    {
      id: '1',
      name: 'Emma',
      image: 'https://images.pexels.com/photos/2100063/pexels-photo-2100063.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'online'
    },
    {
      id: '2',
      name: 'Sarah',
      image: 'https://images.pexels.com/photos/3763789/pexels-photo-3763789.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'online'
    },
    {
      id: '3',
      name: 'Jessica',
      image: 'https://images.pexels.com/photos/2169434/pexels-photo-2169434.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'away'
    }
  ];

  const startVideoCall = (matchName: string) => {
    if (!user) {
      alert('Please sign in to make video calls');
      return;
    }

    const canAfford = creditManager.canAfford(user.id, 60);
    if (canAfford || creditManager.isStaffMember(user.id)) {
      setIsInCall(true);
      setCallDuration(0);
      // Start timer for credit deduction
      const timer = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration % 60 === 0) { // Every minute
           const success = creditManager.deductCredits(user.id, 60);
            if (success) {
              setUserBalance(creditManager.getTotalCredits(user.id));
            } else if (!creditManager.isStaffMember(user.id)) {
              endCall();
              // Show error message
              const errorMessage = document.createElement('div');
              errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
              errorMessage.textContent = 'Insufficient credits for video call!';
              document.body.appendChild(errorMessage);
              setTimeout(() => document.body.removeChild(errorMessage), 3000);
            }
          }
          return newDuration;
        });
      }, 1000);
      (window as any).callTimer = timer;
    } else {
      // Show error message
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = `Need ${formatCredits(60)} per minute for video calls!`;
      document.body.appendChild(errorMessage);
      setTimeout(() => document.body.removeChild(errorMessage), 3000);
    }
  };

  const endCall = () => {
    setIsInCall(false);
    if ((window as any).callTimer) {
      clearInterval((window as any).callTimer);
    }
  };

  if (isInCall) {
    return (
      <Layout
        title="Video Call"
        onBack={endCall}
        showClose={false}
      >
        <div className="h-screen bg-black relative">
          {/* Remote Video */}
          <div className="absolute inset-0">
            <img
              src="https://images.pexels.com/photos/2100063/pexels-photo-2100063.jpeg?auto=compress&cs=tinysrgb&w=400"
              alt="Remote user"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              Emma • {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
            </div>
            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {formatCredits(userBalance)} remaining
            </div>
          </div>

          {/* Local Video */}
          <div className="absolute top-20 right-4 w-32 h-48 bg-gray-800 rounded-2xl overflow-hidden border-2 border-white/20">
            {isVideoOn ? (
              <img
                src="https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400"
                alt="You"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
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
                onClick={() => setIsVideoOn(!isVideoOn)}
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
                onClick={() => setIsMicOn(!isMicOn)}
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
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 hover:scale-105 transition-all duration-300"
                    disabled={match.status !== 'online' || !videoEnabled || !audioEnabled}
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
                        startVideoCall(match.name);
                      }}
                      className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition-colors"
                      disabled={match.status !== 'online'}
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
    </Layout>
  );
};