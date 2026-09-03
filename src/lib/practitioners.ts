import { supabaseClient } from '@/lib/supabase';

/**
 * The therapy screens each carried their own hard-coded list of named
 * professionals - invented people with invented credentials and stock
 * photographs - and a "Book Session" button that told the member their session
 * was booked while saving nothing anywhere.
 *
 * Practitioners now come from the database and only appear once someone has
 * verified them, so a name can never reach a member by being typed into a
 * source file. A booking is recorded as a real request with a real status, and
 * the member is told what will actually happen next rather than that a session
 * they do not have has been confirmed.
 */

export type PractitionerService = 'relationship' | 'couple_therapy' | 'counselling';

export interface Practitioner {
  id: string;
  full_name: string;
  title: string | null;
  specialization: string | null;
  experience_years: number | null;
  price_usd: number | null;
  currency: string;
  photo_url: string | null;
  bio: string | null;
  availability_note: string | null;
}

export async function loadPractitioners(service: PractitionerService): Promise<Practitioner[]> {
  const { data, error } = await supabaseClient
    .from('practitioners')
    .select('id, full_name, title, specialization, experience_years, price_usd, currency, photo_url, bio, availability_note')
    .eq('service', service)
    .eq('is_verified', true)
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error('Could not load practitioners:', error);
    return [];
  }
  return data ?? [];
}

export function formatFee(p: Practitioner): string | null {
  if (p.price_usd == null) return null;
  return `${p.currency === 'USD' ? '$' : p.currency + ' '}${Number(p.price_usd).toFixed(0)}/session`;
}

export interface BookingRequestResult {
  ok: boolean;
  error?: string;
}

/**
 * Records a request. It is not a confirmed appointment and the caller must not
 * describe it as one - the row lands with status 'pending' and a person has to
 * confirm it.
 */
export async function requestBooking(params: {
  userId: string;
  service: PractitionerService;
  practitionerId: string;
  practitionerName: string;
  date: string;
  time: string;
}): Promise<BookingRequestResult> {
  const { userId, service, practitionerId, practitionerName, date, time } = params;

  const scheduledAt = new Date(`${date}T${to24Hour(time)}`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: 'That date and time could not be read. Please pick again.' };
  }

  const { error } = await supabaseClient.from('counselling_bookings').insert({
    user_id: userId,
    booking_type: service,
    scheduled_at: scheduledAt.toISOString(),
    status: 'pending',
    notes: `Requested with ${practitionerName} (${practitionerId}) for ${time}.`,
  });

  if (error) {
    console.error('Booking request failed:', error);
    return { ok: false, error: 'Your request could not be saved. Please try again.' };
  }
  return { ok: true };
}

/** "2:30 PM" -> "14:30:00". Returns the input unchanged if already 24-hour. */
function to24Hour(time: string): string {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return /^\d{1,2}:\d{2}$/.test(time.trim()) ? `${time.trim()}:00` : time;
  let hour = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${m[2]}:00`;
}
