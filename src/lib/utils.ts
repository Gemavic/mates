import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PostgrestError } from "@supabase/supabase-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SafeRequestResult<T> {
  data: T | null;
  success: boolean;
  error?: PostgrestError | Error;
}

export async function safeRequest<T>(
  request: Promise<{ data: T | null; error: PostgrestError | null }>,
  fallbackMessage: string = "Operation failed"
): Promise<SafeRequestResult<T>> {
  try {
    const { data, error } = await request;

    if (error) {
      console.error(`Error in ${fallbackMessage}:`, error);

      showToastError(fallbackMessage, error.message || 'Unknown error');

      return { data: null, success: false, error };
    }

    return { data, success: true };

  } catch (err) {
    const error = err as Error;
    console.error(`Exception in ${fallbackMessage}:`, error);

    showToastError(fallbackMessage, error.message || 'Unexpected error occurred');

    return { data: null, success: false, error };
  }
}

function showToastError(title: string, message: string) {
  const event = new CustomEvent('show-toast', {
    detail: {
      title,
      description: message,
      variant: 'destructive'
    }
  });
  window.dispatchEvent(event);
}

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 5000); // Limit length to prevent DoS
}

/**
 * Sanitize display text (allows some formatting but prevents XSS)
 */
export function sanitizeDisplayText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Allow newlines and basic characters but escape HTML
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, 10000);
}

/**
 * Validate and sanitize URL input
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Only allow http:// and https:// URLs
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
  } catch {
    // Invalid URL
  }

  return '';
}

export const mockProfiles = [
  {
    id: '1',
    name: 'Emma',
    age: 25,
    location: 'New York, NY',
    occupation: 'Graphic Designer',
    education: 'NYU',
    images: ['https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=400'],
    bio: 'Love exploring new coffee shops and weekend hiking adventures.',
    interests: ['Coffee', 'Hiking', 'Design', 'Photography']
  },
  {
    id: '2',
    name: 'Alex',
    age: 28,
    location: 'San Francisco, CA',
    occupation: 'Software Engineer',
    education: 'Stanford',
    images: ['https://images.pexels.com/photos/4173239/pexels-photo-4173239.jpeg?auto=compress&cs=tinysrgb&w=400'],
    bio: 'Tech enthusiast by day, chef by night.',
    interests: ['Cooking', 'Technology', 'Music', 'Travel']
  }
];
