// Application Configuration
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'Dates',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  url: import.meta.env.VITE_APP_URL || 'https://dates.care',
  supportEmail: 'support@dates.care',
  legalEmail: 'legal@dates.care',
  privacyEmail: 'privacy@dates.care',
  disputeEmail: 'disputes@dates.care',
  phone: '+1-209-348-6842',
  // WhatsApp is the primary support channel: free for members wherever they
  // are, written rather than spoken so a scam or payment report arrives with
  // screenshots, and asynchronous so nobody is lost to voicemail.
  //
  // Digits only, no + or dashes - that is the format wa.me requires.
  whatsapp: '14377888011',
};

/**
 * A wa.me link that opens a chat with support, with the message already
 * started so the person does not have to explain themselves twice.
 */
export function whatsappSupportLink(
  message = 'Hi Dates Care, I need help with '
): string {
  return `https://wa.me/${APP_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

// Supabase Configuration
// SECURITY: Only client-safe keys are exposed here
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
};

// Security Configuration
export const SECURITY_CONFIG = {
  encryptionEnabled: import.meta.env.VITE_ENCRYPTION_ENABLED === 'true',
  highSecurityMode: import.meta.env.VITE_HIGH_SECURITY_MODE === 'true',
  maxLoginAttempts: 5,
  loginCooldownMs: 300000, // 5 minutes
  sessionTimeoutMs: 86400000 // 24 hours
};

// Feature Flags
export const FEATURES = {
  cryptoPayments: true,
  mobilePayments: true,
  supabaseDatabase: !!SUPABASE_CONFIG.url && !!SUPABASE_CONFIG.anonKey,
  verification: true,
  staffPanel: true,
  videoChat: true,
  audioChat: true
};

// Validation
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (!SUPABASE_CONFIG.url) {
    errors.push('Missing VITE_SUPABASE_URL');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    errors.push('Missing VITE_SUPABASE_ANON_KEY');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Initialize and log configuration status
export const initializeConfig = () => {
  const validation = validateConfig();
  
  if (validation.isValid) {
    console.log('✅ Application configuration valid');
  } else {
    console.warn('⚠️ Configuration issues detected:', validation.errors);
  }
  
  console.log('🔧 Features available:', Object.entries(FEATURES).filter(([_, enabled]) => enabled).map(([name]) => name));
  
  return validation;
};