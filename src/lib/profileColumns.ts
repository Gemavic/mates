/**
 * The user_profiles columns a member may read on anyone's row.
 *
 * Email, birth date and location coordinates are not among them: the
 * database refuses those on other members' rows, so `select('*')` on
 * user_profiles fails. Read profiles with this list, and read your own
 * private fields with the my_private_profile() function.
 */
// One literal string, so supabase-js can still type the rows it returns.
export const PROFILE_COLUMNS = 'user_id, full_name, first_name, age, location, bio, interests, profile_visibility, is_verified, created_at, updated_at, verification_status, occupation, education, looking_for, distance_preference, age_range_min, age_range_max, is_online, last_active, show_online_status, gender, relationship_status, seeking, country_code, region_code' as const;
