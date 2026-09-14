-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'member'), '[^a-zA-Z0-9_]', '', 'g'));
  IF length(base) < 3 THEN base := base || 'user'; END IF;
  base := left(base, 20);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, candidate, NULLIF(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CONNECTIONS
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT connections_no_self CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX connections_pair_key ON public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections_select_involved" ON public.connections FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "connections_insert_own" ON public.connections FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "connections_update_addressee" ON public.connections FOR UPDATE TO authenticated
  USING (addressee_id = auth.uid() AND status = 'pending') WITH CHECK (addressee_id = auth.uid());
CREATE POLICY "connections_delete_involved" ON public.connections FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.are_connected(a uuid, b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status = 'accepted'
      AND ((c.requester_id = a AND c.addressee_id = b) OR (c.requester_id = b AND c.addressee_id = a))
  );
$$;

-- VAULT ITEMS
CREATE TABLE public.vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'private',
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pin_hash text,
  unlock_seconds int NOT NULL DEFAULT 300,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vault_items_visibility_check CHECK (visibility IN ('private','protected')),
  CONSTRAINT vault_items_unlock_seconds_check CHECK (unlock_seconds BETWEEN 30 AND 3600)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_items TO authenticated;
GRANT ALL ON public.vault_items TO service_role;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vault_items_select_owner_or_approver" ON public.vault_items FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (visibility = 'protected' AND approver_id = auth.uid()));
CREATE POLICY "vault_items_insert_own" ON public.vault_items FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vault_items_update_own" ON public.vault_items FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vault_items_delete_own" ON public.vault_items FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- hide the pin hash from client reads
REVOKE SELECT ON public.vault_items FROM authenticated;
GRANT SELECT (id, owner_id, name, storage_path, mime_type, size_bytes, visibility, approver_id, unlock_seconds, created_at) ON public.vault_items TO authenticated;

CREATE OR REPLACE FUNCTION public.vault_items_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.visibility = 'protected' THEN
    IF NEW.approver_id IS NULL THEN RAISE EXCEPTION 'A protected file needs a trusted approver'; END IF;
    IF NOT public.are_connected(NEW.owner_id, NEW.approver_id) THEN
      RAISE EXCEPTION 'Approver must be an accepted trusted connection';
    END IF;
  ELSE
    NEW.approver_id := NULL;
    NEW.pin_hash := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER vault_items_validate_trg BEFORE INSERT OR UPDATE ON public.vault_items
  FOR EACH ROW EXECUTE FUNCTION public.vault_items_validate();

-- ACCESS REQUESTS
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.vault_items(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  pin_verified boolean NOT NULL DEFAULT false,
  unlock_expires_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_requests_status_check CHECK (status IN ('pending','approved','denied','cancelled'))
);
CREATE INDEX access_requests_item_idx ON public.access_requests (item_id, created_at DESC);
CREATE INDEX access_requests_approver_idx ON public.access_requests (approver_id, status);
GRANT SELECT, INSERT, UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_requests_select_involved" ON public.access_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR approver_id = auth.uid());
CREATE POLICY "access_requests_insert_requester" ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.vault_items v
    WHERE v.id = item_id AND v.owner_id = auth.uid()
      AND v.visibility = 'protected' AND v.approver_id = access_requests.approver_id
  ));
CREATE POLICY "access_requests_update_approver" ON public.access_requests FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() AND status = 'pending')
  WITH CHECK (approver_id = auth.uid() AND status IN ('approved','denied'));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ACTIVITY
CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_user_idx ON public.activity_events (user_id, created_at DESC);
GRANT SELECT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select_own" ON public.activity_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- NOTIFICATION / ACTIVITY TRIGGERS
CREATE OR REPLACE FUNCTION public.notify(p_user uuid, p_actor uuid, p_type text, p_title text, p_body text, p_entity uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, entity_id)
  VALUES (p_user, p_actor, p_type, p_title, p_body, p_entity);
$$;

CREATE OR REPLACE FUNCTION public.log_activity(p_user uuid, p_actor uuid, p_type text, p_message text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.activity_events (user_id, actor_id, type, message) VALUES (p_user, p_actor, p_type, p_message);
$$;

CREATE OR REPLACE FUNCTION public.uname(p uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(display_name, username, 'Someone') FROM public.profiles WHERE id = p;
$$;

CREATE OR REPLACE FUNCTION public.connections_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NEW.addressee_id, NEW.requester_id, 'connection_request',
      public.uname(NEW.requester_id) || ' wants to connect', 'Review the request in Connections.', NEW.id);
    PERFORM public.log_activity(NEW.requester_id, NEW.requester_id, 'connection_request',
      'You sent a connection request to ' || public.uname(NEW.addressee_id));
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    NEW.updated_at := now();
    IF NEW.status = 'accepted' THEN
      PERFORM public.notify(NEW.requester_id, NEW.addressee_id, 'connection_accepted',
        public.uname(NEW.addressee_id) || ' accepted your request', 'You are now trusted connections.', NEW.id);
      PERFORM public.log_activity(NEW.requester_id, NEW.addressee_id, 'connection_accepted',
        public.uname(NEW.addressee_id) || ' became a trusted connection');
      PERFORM public.log_activity(NEW.addressee_id, NEW.addressee_id, 'connection_accepted',
        'You accepted ' || public.uname(NEW.requester_id) || ' as a trusted connection');
    ELSIF NEW.status = 'declined' THEN
      PERFORM public.notify(NEW.requester_id, NEW.addressee_id, 'connection_declined',
        public.uname(NEW.addressee_id) || ' declined your request', NULL, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER connections_events_ins AFTER INSERT ON public.connections FOR EACH ROW EXECUTE FUNCTION public.connections_events();
CREATE TRIGGER connections_events_upd BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.connections_events();

CREATE OR REPLACE FUNCTION public.access_requests_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_name text;
BEGIN
  SELECT name INTO item_name FROM public.vault_items WHERE id = NEW.item_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NEW.approver_id, NEW.requester_id, 'access_request',
      public.uname(NEW.requester_id) || ' requests access', 'Unlock request for "' || item_name || '"', NEW.id);
    PERFORM public.log_activity(NEW.requester_id, NEW.requester_id, 'access_request',
      'You requested approval for "' || item_name || '"');
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.notify(NEW.requester_id, NEW.approver_id, 'access_approved',
        public.uname(NEW.approver_id) || ' approved access', 'Access granted for "' || item_name || '"', NEW.id);
      PERFORM public.log_activity(NEW.requester_id, NEW.approver_id, 'access_approved',
        public.uname(NEW.approver_id) || ' approved access to "' || item_name || '"');
      PERFORM public.log_activity(NEW.approver_id, NEW.approver_id, 'access_approved',
        'You approved access to ' || public.uname(NEW.requester_id) || '''s "' || item_name || '"');
    ELSIF NEW.status = 'denied' THEN
      PERFORM public.notify(NEW.requester_id, NEW.approver_id, 'access_denied',
        public.uname(NEW.approver_id) || ' denied access', 'Access denied for "' || item_name || '"', NEW.id);
      PERFORM public.log_activity(NEW.requester_id, NEW.approver_id, 'access_denied',
        public.uname(NEW.approver_id) || ' denied access to "' || item_name || '"');
      PERFORM public.log_activity(NEW.approver_id, NEW.approver_id, 'access_denied',
        'You denied access to ' || public.uname(NEW.requester_id) || '''s "' || item_name || '"');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER access_requests_events_ins AFTER INSERT ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.access_requests_events();
CREATE TRIGGER access_requests_events_upd AFTER UPDATE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.access_requests_events();

CREATE OR REPLACE FUNCTION public.access_requests_decide_stamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> OLD.status AND NEW.status IN ('approved','denied') THEN
    NEW.decided_at := now();
    NEW.pin_verified := false;
    NEW.unlock_expires_at := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER access_requests_decide_stamp_trg BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.access_requests_decide_stamp();

-- REALTIME
ALTER TABLE public.connections REPLICA IDENTITY FULL;
ALTER TABLE public.vault_items REPLICA IDENTITY FULL;
ALTER TABLE public.access_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.activity_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;