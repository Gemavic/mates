import { Device, Call } from '@twilio/voice-sdk';
import { supabaseClient } from './supabase';

export class TwilioVoiceManager {
  private device: Device | null = null;
  private currentCall: any = null;

  async getToken(userId: string): Promise<string> {
    try {
      // getSession() has no built-in timeout and can hang indefinitely on a
      // slow/real mobile connection (see AuthContext.tsx, which hit this
      // exact issue for the shared auth state) - race it against a timeout
      // so a call attempt fails fast with a clear error instead of leaving
      // the caller (AudioChat's "Initializing..." button) stuck forever.
      const sessionPromise = supabaseClient.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 15000)
      );
      const session = await Promise.race([sessionPromise, timeoutPromise]);
      if (!session.data.session) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      console.log('[Twilio Voice] Requesting token for user:', userId);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-voice-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      console.log('[Twilio Voice] Token response:', { success: data.success, hasToken: !!data.token, testMode: data.testMode });

      if (!data.success) {
        if (data.testMode) {
          throw new Error('Twilio credentials not configured. Please contact support or check the TWILIO_TROUBLESHOOTING.md file.');
        }
        throw new Error(data.error || 'Failed to get voice token');
      }

      return data.token;
    } catch (error) {
      console.error('[Twilio Voice] Error getting voice token:', error);
      throw error;
    }
  }

  /**
   * @param handlers.onIncoming fires when Twilio delivers a call to this
   *   device. It used to only stash the call in `currentCall`, and nothing
   *   anywhere called acceptIncomingCall() - so every audio call ended as
   *   No Answer after 0 seconds no matter what the callee did.
   */
  async initialize(
    userId: string,
    handlers: { onIncoming?: (call: Call) => void } = {}
  ): Promise<void> {
    try {
      const token = await this.getToken(userId);

      this.device = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
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
        handlers.onIncoming?.(call);
      });

      await this.device.register();
    } catch (error) {
      console.error('Error initializing Twilio Voice:', error);
      throw error;
    }
  }

  /**
   * @param handlers.onAnswered fires when the callee actually picks up.
   *   device.connect() resolves as soon as the call is *placed*, so anything
   *   that keyed off it - notably the per-minute billing timer - started while
   *   the other phone was still ringing, and charged for calls nobody answered.
   */
  async makeCall(
    toUserId: string,
    handlers: { onAnswered?: () => void; onEnded?: () => void } = {}
  ): Promise<void> {
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
        handlers.onAnswered?.();
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        this.currentCall = null;
        handlers.onEnded?.();
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        this.currentCall = null;
        handlers.onEnded?.();
      });

      call.on('reject', () => {
        console.log('Call rejected');
        this.currentCall = null;
        handlers.onEnded?.();
      });

    } catch (error) {
      console.error('Error making call:', error);
      throw error;
    }
  }

  acceptIncomingCall(handlers: { onAnswered?: () => void; onEnded?: () => void } = {}): void {
    if (!this.currentCall) return;
    const call = this.currentCall;
    call.on('accept', () => handlers.onAnswered?.());
    call.on('disconnect', () => {
      this.currentCall = null;
      handlers.onEnded?.();
    });
    call.on('cancel', () => {
      this.currentCall = null;
      handlers.onEnded?.();
    });
    call.accept();
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
