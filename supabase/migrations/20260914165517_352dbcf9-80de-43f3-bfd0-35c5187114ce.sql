REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.are_connected(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vault_items_validate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify(uuid, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_activity(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.uname(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.connections_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.access_requests_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.access_requests_decide_stamp() FROM PUBLIC, anon, authenticated;