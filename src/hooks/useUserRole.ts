import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves the signed-in user's roles from the `user_roles` table.
 * Roles are never read from client storage — always from the database.
 */
export const useUserRole = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    const resolve = async (uid: string | null, retryAfterRefresh = true) => {
      const currentRequest = ++requestId;
      if (!uid) {
        if (!active) return;
        setUserId(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUserId(uid);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (!active || currentRequest !== requestId) return;
      if (error && retryAfterRefresh) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.user) {
          await resolve(refreshed.session.user.id, false);
          return;
        }
      }
      if (error) console.error("Failed to load user roles:", error);
      setIsAdmin(Boolean(data?.some((row) => row.role === "admin")));
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolve(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // getSession above initializes this hook. A token refresh does not
      // change the user's permissions, so querying roles again only creates
      // duplicate requests and can hide the Dashboard during a refresh.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const uid = session?.user?.id ?? null;
      setLoading(true);
      // defer the Supabase call out of the auth callback
      setTimeout(() => resolve(uid), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { userId, isAdmin, loading };
};
