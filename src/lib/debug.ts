// Debug utilities for diagnosing configuration issues

export const logEnvironmentStatus = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const status = {
    timestamp: new Date().toISOString(),
    supabaseUrl: {
      exists: !!supabaseUrl,
      value: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
      length: supabaseUrl?.length || 0
    },
    supabaseKey: {
      exists: !!supabaseKey,
      value: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'MISSING',
      length: supabaseKey?.length || 0,
      startsWithEyJ: supabaseKey?.startsWith('eyJ') || false
    },
    environment: import.meta.env.MODE,
    allKeys: Object.keys(import.meta.env)
      .filter(k => k.includes('VITE_'))
      .map(k => `${k}: ${(import.meta.env as any)[k]?.substring(0, 10) || 'MISSING'}`)
  };

  console.group('Environment Status');
  console.table(status);
  console.log('Full environment keys:', Object.keys(import.meta.env).filter(k => k.includes('SUPABASE')));
  console.groupEnd();

  return status;
};

export const getEnvironmentSummary = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return {
    hasUrl: !!supabaseUrl && supabaseUrl.length > 0,
    hasKey: !!supabaseKey && supabaseKey.length > 0,
    keyFormat: supabaseKey?.startsWith('eyJ') ? 'valid' : 'invalid',
    mode: import.meta.env.MODE
  };
};
