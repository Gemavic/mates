export interface RouteConfig {
  requireAuth: boolean;
  allowAnonymous: boolean;
  isPublicOnly: boolean;
  redirectIfAuthenticated: string;
}

export const routeConfig: Record<string, Partial<RouteConfig>> = {
  welcome: {
    requireAuth: false,
    isPublicOnly: false,
  },

  signin: {
    requireAuth: false,
    isPublicOnly: true,
    redirectIfAuthenticated: 'discovery',
  },

  signup: {
    requireAuth: false,
    isPublicOnly: true,
    redirectIfAuthenticated: 'discovery',
  },

  'auth-callback': {
    requireAuth: false,
    isPublicOnly: false,
  },

  discovery: {
    requireAuth: true,
    allowAnonymous: true,
  },

  'browse-profiles': {
    requireAuth: true,
    allowAnonymous: true,
  },

  matches: {
    requireAuth: true,
    allowAnonymous: false,
  },

  likes: {
    requireAuth: true,
    allowAnonymous: false,
  },

  credits: {
    requireAuth: true,
    allowAnonymous: false,
  },

  'gift-shop': {
    requireAuth: true,
    allowAnonymous: true,
  },

  mail: {
    requireAuth: true,
    allowAnonymous: false,
  },

  profile: {
    requireAuth: true,
    allowAnonymous: false,
  },

  'view-profile': {
    requireAuth: true,
    allowAnonymous: true,
  },

  settings: {
    requireAuth: true,
    allowAnonymous: false,
  },

  verification: {
    requireAuth: true,
    allowAnonymous: false,
  },

  'payment-setup': {
    requireAuth: true,
    allowAnonymous: false,
  },

  'video-chat': {
    requireAuth: true,
    allowAnonymous: false,
  },

  'audio-chat': {
    requireAuth: true,
    allowAnonymous: false,
  },

  onboarding: {
    requireAuth: true,
    allowAnonymous: false,
  },

  terms: {
    requireAuth: false,
    allowAnonymous: true,
  },

  privacy: {
    requireAuth: false,
    allowAnonymous: true,
  },

  'payment-refund': {
    requireAuth: false,
    allowAnonymous: true,
  },

  misconduct: {
    requireAuth: false,
    allowAnonymous: true,
  },

  consent: {
    requireAuth: false,
    allowAnonymous: true,
  },

  disclaimer: {
    requireAuth: false,
    allowAnonymous: true,
  },

  dispute: {
    requireAuth: false,
    allowAnonymous: true,
  },

  help: {
    requireAuth: false,
    allowAnonymous: true,
  },

  'care-blog': {
    requireAuth: false,
    allowAnonymous: true,
  },

  quizzes: {
    requireAuth: false,
    allowAnonymous: true,
  },

  newsfeed: {
    requireAuth: true,
    allowAnonymous: true,
  },

  'relationship-services': {
    requireAuth: false,
    allowAnonymous: true,
  },

  education: {
    requireAuth: false,
    allowAnonymous: true,
  },

  'financial-education': {
    requireAuth: false,
    allowAnonymous: true,
  },

  'match-suitor': {
    requireAuth: true,
    allowAnonymous: false,
  },

  feedback: {
    requireAuth: false,
    allowAnonymous: true,
  },

  'staff-panel': {
    requireAuth: false,
    allowAnonymous: true,
  },

  'menu-showcase': {
    requireAuth: false,
    allowAnonymous: true,
  },

  checkout: {
    requireAuth: true,
    allowAnonymous: false,
  },

  success: {
    requireAuth: true,
    allowAnonymous: false,
  },

  cancel: {
    requireAuth: true,
    allowAnonymous: false,
  },

  monitoring: {
    requireAuth: true,
    allowAnonymous: false,
  },
};

export function getRouteConfig(screen: string): RouteConfig {
  const config = routeConfig[screen] || {};

  return {
    requireAuth: config.requireAuth ?? false,
    allowAnonymous: config.allowAnonymous ?? true,
    isPublicOnly: config.isPublicOnly ?? false,
    redirectIfAuthenticated: config.redirectIfAuthenticated ?? 'discovery',
  };
}
