import { supabaseClient } from './supabase';

export interface TwilioVideoToken {
  token: string;
  roomName: string;
  identity: string;
}

export interface TwilioVoiceToken {
  token: string;
  identity: string;
}

export class TwilioService {
  static async getVideoToken(roomName: string, userId: string): Promise<TwilioVideoToken | null> {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-video-token`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get video token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting video token:', error);
      return null;
    }
  }

  static async getVoiceToken(userId: string): Promise<TwilioVoiceToken | null> {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-voice-token`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get voice token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting voice token:', error);
      return null;
    }
  }

  static async sendSMSVerification(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms-verification`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }
}
