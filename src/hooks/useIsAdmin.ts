import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useIsAdmin() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["user_role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const roles = (data ?? []).map((r) => r.role);
      return { isAdmin: roles.includes("admin"), isModerator: roles.includes("moderator"), roles };
    },
  });
  return {
    isAdmin: q.data?.isAdmin ?? false,
    isModerator: q.data?.isModerator ?? false,
    isStaff: (q.data?.isAdmin || q.data?.isModerator) ?? false,
    loading: q.isLoading,
  };
}
