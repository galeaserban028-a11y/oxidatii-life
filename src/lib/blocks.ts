import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlockedUser = {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked: {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

/** Is `viewer` blocked-by or blocking `target` (either direction)? */
export function useIsBlocked(viewerId?: string | null, targetId?: string | null) {
  return useQuery({
    queryKey: ["block-status", viewerId, targetId],
    enabled: !!viewerId && !!targetId && viewerId !== targetId,
    queryFn: async () => {
      if (!viewerId || !targetId) return { blocking: false, blockedBy: false };
      const { data } = await supabase
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${viewerId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${viewerId})`,
        );
      const rows = data ?? [];
      return {
        blocking: rows.some((r) => r.blocker_id === viewerId),
        blockedBy: rows.some((r) => r.blocker_id === targetId),
      };
    },
  });
}

/** List of people the current user has blocked. */
export function useBlockedList(userId?: string | null) {
  return useQuery({
    queryKey: ["blocks-list", userId],
    enabled: !!userId,
    queryFn: async (): Promise<BlockedUser[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("blocks")
        .select(
          "id, blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, handle, display_name, avatar_url)",
        )
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        const { data: rows } = await supabase
          .from("blocks")
          .select("id, blocked_id, created_at")
          .eq("blocker_id", userId)
          .order("created_at", { ascending: false });
        if (!rows || rows.length === 0) return [];
        type ProfileLite = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url")
          .in(
            "id",
            rows.map((r) => r.blocked_id),
          );
        const map = new Map(((profs ?? []) as ProfileLite[]).map((p) => [p.id, p]));
        return rows.map((r) => ({ ...r, blocked: map.get(r.blocked_id) ?? null })) as BlockedUser[];
      }
      return (data ?? []) as unknown as BlockedUser[];
    },
  });
}

export function useBlockMutations(viewerId: string | null | undefined, targetId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["block-status", viewerId, targetId] });
    qc.invalidateQueries({ queryKey: ["blocks-list", viewerId] });
    qc.invalidateQueries({ queryKey: ["follow-status", viewerId, targetId] });
    qc.invalidateQueries({ queryKey: ["follow-stats", viewerId] });
    qc.invalidateQueries({ queryKey: ["follow-stats", targetId] });
  };

  const block = useMutation({
    mutationFn: async () => {
      if (!viewerId) throw new Error("Trebuie să fii logat");
      const { error } = await supabase
        .from("blocks")
        .insert({ blocker_id: viewerId, blocked_id: targetId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unblock = useMutation({
    mutationFn: async () => {
      if (!viewerId) throw new Error("Trebuie să fii logat");
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", viewerId)
        .eq("blocked_id", targetId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { block, unblock };
}
