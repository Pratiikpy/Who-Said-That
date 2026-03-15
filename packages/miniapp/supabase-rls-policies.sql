-- ============================================================================
-- Who Said That — Supabase Row Level Security (RLS) Policies
-- ============================================================================
--
-- Architecture note:
--   This app uses Farcaster Quick Auth, NOT Supabase Auth.
--   There is no auth.uid() session. Instead:
--     - The anon key is used client-side for SELECT queries only.
--     - The service_role key is used server-side (API routes) for all writes.
--     - service_role bypasses RLS entirely, so write policies only need to
--       block the anon key from mutating data.
--
-- To support fid-scoped reads on the anon key, clients must set a request
-- header via supabase.rpc or .functions, or we use a custom GUC variable:
--
--   supabase.from('confessions').select('*')
--
-- For fid-scoped policies, the client must call:
--   await supabase.rpc('set_current_fid', { fid: userFid })
-- before making queries. This sets a session-level GUC that RLS reads.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Helper: session-level FID for anon-key RLS
-- ────────────────────────────────────────────────────────────────────────────

-- Create a function clients call to declare their fid for the current session.
-- The value is stored in a PostgreSQL GUC (Grand Unified Configuration) variable.
CREATE OR REPLACE FUNCTION public.set_current_fid(fid bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_fid', fid::text, false);
END;
$$;

-- Helper to read the current fid (returns 0 if not set).
CREATE OR REPLACE FUNCTION public.current_fid()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.current_fid', true), ''), '0')::bigint;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1. USERS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Profiles are publicly readable by everyone (anon + authenticated).
CREATE POLICY "users_select_public"
  ON public.users
  FOR SELECT
  USING (true);

-- Writes are blocked for anon key. service_role bypasses RLS.
CREATE POLICY "users_insert_service_only"
  ON public.users
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "users_update_service_only"
  ON public.users
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "users_delete_service_only"
  ON public.users
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 2. CONFESSIONS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;

-- Public confessions are readable by everyone.
-- Private confessions are only readable by the recipient (matched via current_fid()).
CREATE POLICY "confessions_select"
  ON public.confessions
  FOR SELECT
  USING (
    is_public = true
    OR recipient_fid = public.current_fid()
    OR sender_fid = public.current_fid()
  );

-- Writes blocked for anon key. All inserts go through service_role API routes.
CREATE POLICY "confessions_insert_service_only"
  ON public.confessions
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "confessions_update_service_only"
  ON public.confessions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "confessions_delete_service_only"
  ON public.confessions
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 3. GUESSES
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.guesses ENABLE ROW LEVEL SECURITY;

-- Guesses are readable by the guesser or the confession recipient.
CREATE POLICY "guesses_select"
  ON public.guesses
  FOR SELECT
  USING (
    guesser_fid = public.current_fid()
    OR confession_id IN (
      SELECT id FROM public.confessions
      WHERE recipient_fid = public.current_fid()
    )
  );

-- Writes blocked for anon key.
CREATE POLICY "guesses_insert_service_only"
  ON public.guesses
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "guesses_update_service_only"
  ON public.guesses
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "guesses_delete_service_only"
  ON public.guesses
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 4. HINTS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.hints ENABLE ROW LEVEL SECURITY;

-- Hints are readable by the buyer or the confession recipient.
CREATE POLICY "hints_select"
  ON public.hints
  FOR SELECT
  USING (
    buyer_fid = public.current_fid()
    OR confession_id IN (
      SELECT id FROM public.confessions
      WHERE recipient_fid = public.current_fid()
    )
  );

-- Writes blocked for anon key.
CREATE POLICY "hints_insert_service_only"
  ON public.hints
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "hints_update_service_only"
  ON public.hints
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "hints_delete_service_only"
  ON public.hints
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 5. THREADS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- Threads are readable only by participants of the confession
-- (sender or recipient).
CREATE POLICY "threads_select"
  ON public.threads
  FOR SELECT
  USING (
    confession_id IN (
      SELECT id FROM public.confessions
      WHERE recipient_fid = public.current_fid()
         OR sender_fid = public.current_fid()
    )
  );

-- Writes blocked for anon key.
CREATE POLICY "threads_insert_service_only"
  ON public.threads
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "threads_update_service_only"
  ON public.threads
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "threads_delete_service_only"
  ON public.threads
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 6. REACTIONS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Reactions are publicly readable (public counts).
CREATE POLICY "reactions_select_public"
  ON public.reactions
  FOR SELECT
  USING (true);

-- Writes blocked for anon key.
CREATE POLICY "reactions_insert_service_only"
  ON public.reactions
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "reactions_update_service_only"
  ON public.reactions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "reactions_delete_service_only"
  ON public.reactions
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 7. NOTIFICATION_TOKENS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

-- Only the owner (matching fid) can read their own tokens.
CREATE POLICY "notification_tokens_select_own"
  ON public.notification_tokens
  FOR SELECT
  USING (fid = public.current_fid());

-- Writes blocked for anon key. Webhook route uses service_role.
CREATE POLICY "notification_tokens_insert_service_only"
  ON public.notification_tokens
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "notification_tokens_update_service_only"
  ON public.notification_tokens
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "notification_tokens_delete_service_only"
  ON public.notification_tokens
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 8. ROOMS
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Rooms are readable by everyone (discovery).
CREATE POLICY "rooms_select_public"
  ON public.rooms
  FOR SELECT
  USING (true);

-- Writes blocked for anon key.
CREATE POLICY "rooms_insert_service_only"
  ON public.rooms
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "rooms_update_service_only"
  ON public.rooms
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "rooms_delete_service_only"
  ON public.rooms
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 9. ROOM_MESSAGES
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Room messages are readable by everyone in the room (public rooms).
CREATE POLICY "room_messages_select_public"
  ON public.room_messages
  FOR SELECT
  USING (true);

-- Writes blocked for anon key.
CREATE POLICY "room_messages_insert_service_only"
  ON public.room_messages
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "room_messages_update_service_only"
  ON public.room_messages
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "room_messages_delete_service_only"
  ON public.room_messages
  FOR DELETE
  USING (false);


-- ════════════════════════════════════════════════════════════════════════════
-- 10. GRANT PERMISSIONS
-- ════════════════════════════════════════════════════════════════════════════

-- The anon role should only be able to SELECT (reads) and call set_current_fid.
-- Revoke any write privileges on all tables for the anon role.
-- (service_role bypasses RLS and retains full access.)

REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.confessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.guesses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.hints FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.threads FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.reactions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notification_tokens FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.rooms FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.room_messages FROM anon;

-- Ensure anon can SELECT all tables (RLS will filter rows).
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.confessions TO anon;
GRANT SELECT ON public.guesses TO anon;
GRANT SELECT ON public.hints TO anon;
GRANT SELECT ON public.threads TO anon;
GRANT SELECT ON public.reactions TO anon;
GRANT SELECT ON public.notification_tokens TO anon;
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT ON public.room_messages TO anon;

-- Allow anon to call the set_current_fid function.
GRANT EXECUTE ON FUNCTION public.set_current_fid(bigint) TO anon;
GRANT EXECUTE ON FUNCTION public.current_fid() TO anon;

-- Ensure authenticated role has same SELECT access (if you add Supabase Auth later).
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.confessions TO authenticated;
GRANT SELECT ON public.guesses TO authenticated;
GRANT SELECT ON public.hints TO authenticated;
GRANT SELECT ON public.threads TO authenticated;
GRANT SELECT ON public.reactions TO authenticated;
GRANT SELECT ON public.notification_tokens TO authenticated;
GRANT SELECT ON public.rooms TO authenticated;
GRANT SELECT ON public.room_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_fid(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_fid() TO authenticated;
