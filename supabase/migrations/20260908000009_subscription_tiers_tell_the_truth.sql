-- The feature lists on the membership plans promised things the code does
-- not do: "Personal matchmaker", "Relationship coaching", "Exclusive events",
-- "Concierge support", "Priority matching", "13 SuperLikes/day", "Unlimited
-- boosts", "Read receipts", "Typing indicators". None of those exist.
--
-- The one plan benefit the server actually enforces is in spend_credits:
-- platinum and elite members are not charged for voice or video calls.
-- Silver and gold enforce nothing a free member does not already have (chat
-- is free for everyone), so they are switched off until they mean something.
-- Prices are untouched; only the words and the on/off flag change.

update public.subscription_tiers set
  features = '["Voice calls included - no per-minute charge","Video calls included - no per-minute charge","Credits still needed for mail attachments, gifts and super likes"]'::jsonb,
  description = 'Call as much as you like. Everything else works exactly as it does for every member.',
  updated_at = now()
where tier_name = 'platinum';

update public.subscription_tiers set
  features = '["Voice calls included - no per-minute charge","Video calls included - no per-minute charge","Credits still needed for mail attachments, gifts and super likes"]'::jsonb,
  description = 'The same calling benefit as Platinum. More features are being built; buy this one only if you want to support the site.',
  updated_at = now()
where tier_name = 'elite';

update public.subscription_tiers set
  is_active = false,
  description = 'Not available until it includes something the free membership does not.',
  updated_at = now()
where tier_name in ('silver', 'gold');

update public.subscription_tiers set
  features = '["Browse and match","Free unlimited chat","Likes and blinks","Buy credits for mail attachments, gifts, super likes and calls"]'::jsonb,
  updated_at = now()
where tier_name = 'free';
