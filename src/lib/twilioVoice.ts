import { Device } from '@twilio/voice-sdk';
import { supabaseClient } from './supabase';

export class TwilioVoiceManager {
  private device: Device | null = null;
  private currentCall: any = null;

  async getToken(userId: string): Promise<string> {
    try {
      const session = await supabaseClient.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-voice-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get voice token');
      }

      return data.token;
    } catch (error) {
      console.error('Error getting voice token:', error);
      throw error;
    }
  }

  async initialize(userId: string): Promise<void> {
    try {
      const token = await this.getToken(userId);

      this.device = new Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        enableRingingState: true,
        logLevel: 1,
      });

      this.device.on('registered', () => {
        console.log('Twilio Device registered');
      });

      this.device.on('error', (error) => {
        console.error('Twilio Device error:', error);
      });

      this.device.on('incoming', (call) => {
        console.log('Incoming call from:', call.parameters.From);
        this.currentCall = call;
      });

      await this.device.register();
    } catch (error) {
      console.error('Error initializing Twilio Voice:', error);
      throw error;
    }
  }

  async makeCall(toUserId: string): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    try {
      const call = await this.device.connect({
        params: {
          To: `user_${toUserId}`,
        },
      });

      this.currentCall = call;

      call.on('accept', () => {
        console.log('Call accepted');
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        this.currentCall = null;
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        this.currentCall = null;
      });

      call.on('reject', () => {
        console.log('Call rejected');
        this.currentCall = null;
      });

    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  acceptIncomingCall(): void {
    if (this.currentCall) {
      this.currentCall.accept();
    }
  }

  rejectIncomingCall(): void {
    if (this.currentCall) {
      this.currentCall.reject();
      this.currentCall = null;
    }
  }

  endCall(): void {
    if (this.currentCall) {
      this.currentCall.disconnect();
      this.currentCall = null;
    }
  }

  toggleMute(muted: boolean): void {
    if (this.currentCall) {
      this.currentCall.mute(muted);
    }
  }

  async destroy(): Promise<void> {
    if (this.device) {
      this.device.unregister();
      this.device.destroy();
      this.device = null;
    }
    this.currentCall = null;
  }

  isCallActive(): boolean {
    return this.currentCall !== null;
  }
}

export const twilioVoiceManager = new TwilioVoiceManager();
