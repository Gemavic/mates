import { connect, Room, LocalVideoTrack, LocalAudioTrack, RemoteParticipant, RemoteTrack, RemoteVideoTrack, RemoteAudioTrack, createLocalVideoTrack, createLocalAudioTrack } from 'twilio-video';
import { supabaseClient } from './supabase';

export class TwilioVideoManager {
  private room: Room | null = null;
  private localVideoTrack: LocalVideoTrack | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;

  async getToken(roomName: string, userId: string): Promise<string> {
    try {
      const session = await supabaseClient.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      console.log('[Twilio Video] Requesting token for room:', roomName);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-video-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName, userId }),
      });

      const data = await response.json();
      console.log('[Twilio Video] Token response:', { success: data.success, hasToken: !!data.token, testMode: data.testMode });

      if (!data.success) {
        if (data.testMode) {
          throw new Error('Twilio credentials not configured. Please contact support or check the TWILIO_TROUBLESHOOTING.md file.');
        }
        throw new Error(data.error || 'Failed to get video token');
      }

      return data.token;
    } catch (error) {
      console.error('[Twilio Video] Error getting video token:', error);
      throw error;
    }
  }

  async joinRoom(
    roomName: string,
    userId: string,
    onParticipantConnected?: (participant: RemoteParticipant) => void,
    onParticipantDisconnected?: (participant: RemoteParticipant) => void,
    onTrackSubscribed?: (track: RemoteTrack, participant: RemoteParticipant) => void
  ): Promise<Room> {
    try {
      const token = await this.getToken(roomName, userId);

      const room = await connect(token, {
        name: roomName,
        audio: true,
        video: { width: 640, height: 480 },
        networkQuality: { local: 1, remote: 1 },
      });

      this.room = room;

      room.on('participantConnected', (participant) => {
        console.log(`Participant connected: ${participant.identity}`);
        if (onParticipantConnected) onParticipantConnected(participant);

        participant.tracks.forEach((publication) => {
          if (publication.isSubscribed && publication.track) {
            if (onTrackSubscribed) onTrackSubscribed(publication.track as RemoteTrack, participant);
          }
        });

        participant.on('trackSubscribed', (track) => {
          if (onTrackSubscribed) onTrackSubscribed(track, participant);
        });
      });

      room.on('participantDisconnected', (participant) => {
        console.log(`Participant disconnected: ${participant.identity}`);
        if (onParticipantDisconnected) onParticipantDisconnected(participant);
      });

      room.participants.forEach((participant) => {
        console.log(`Already in room: ${participant.identity}`);
        if (onParticipantConnected) onParticipantConnected(participant);

        participant.tracks.forEach((publication) => {
          if (publication.isSubscribed && publication.track) {
            if (onTrackSubscribed) onTrackSubscribed(publication.track as RemoteTrack, participant);
          }
        });

        participant.on('trackSubscribed', (track) => {
          if (onTrackSubscribed) onTrackSubscribed(track, participant);
        });
      });

      return room;
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async startLocalVideo(): Promise<LocalVideoTrack> {
    try {
      const track = await createLocalVideoTrack({
        width: 640,
        height: 480,
        frameRate: 24,
      });
      this.localVideoTrack = track;
      return track;
    } catch (error) {
      console.error('Error starting local video:', error);
      throw error;
    }
  }

  async startLocalAudio(): Promise<LocalAudioTrack> {
    try {
      const track = await createLocalAudioTrack();
      this.localAudioTrack = track;
      return track;
    } catch (error) {
      console.error('Error starting local audio:', error);
      throw error;
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localVideoTrack) {
      if (enabled) {
        this.localVideoTrack.enable();
      } else {
        this.localVideoTrack.disable();
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localAudioTrack) {
      if (enabled) {
        this.localAudioTrack.enable();
      } else {
        this.localAudioTrack.disable();
      }
    }
  }

  leaveRoom() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
    }
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
  }

  attachTrack(track: RemoteVideoTrack | RemoteAudioTrack | LocalVideoTrack | LocalAudioTrack, container: HTMLElement) {
    const mediaElement = track.attach();
    container.appendChild(mediaElement);
    return mediaElement;
  }

  detachTrack(track: RemoteVideoTrack | RemoteAudioTrack | LocalVideoTrack | LocalAudioTrack) {
    track.detach().forEach((el) => el.remove());
  }
}

export const twilioVideoManager = new TwilioVideoManager();
