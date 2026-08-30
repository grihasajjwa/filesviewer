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

    const resolve = async (uid: string | null, retryAfterRefresh = true) => {
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

      if (!active) return;
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
