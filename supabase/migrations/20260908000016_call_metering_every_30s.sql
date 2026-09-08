-- Meter calls every 30 seconds instead of every minute.
--
-- Twilio will not accept a room shorter than ten minutes, so the hard cap
-- cannot catch a caller who runs out of credit in the first minutes; the
-- meter must. With a one-minute tick a shortfall could go 60-70 s before the
-- hang-up landed. pg_cron 1.5+ accepts second-level intervals, so the same
-- job now runs twice a minute; call_metering_tick() only posts to
-- call-reconcile when a hang-up is actually pending, so the extra runs are
-- one cheap query each. Re-scheduling under the same name replaces the job.
select cron.schedule('call-metering-tick', '30 seconds', 'select public.call_metering_tick();');
