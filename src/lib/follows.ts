import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FollowStatus = "none" | "pending" | "accepted";

export type FollowStats = {
  followers: number;
  following: number;
};

/** Counts of accepted followers/following for a user (publicly readable). */
export function useFollowStats(userId?: string | null) {
  return useQuery({
    queryKey: ["follow-stats", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FollowStats> => {
      if (!userId) return { followers: 0, following: 0 };
      const [followers, following] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { head: true, count: "exact" })
          .eq("following_id", userId)
          .eq("status", "accepted"),
        supabase
          .from("follows")
          .select("id", { head: true, count: "exact" })
          .eq("follower_id", userId)
          .eq("status", "accepted"),
      ]);
      return {
        followers: followers.count ?? 0,
        following: following.count ?? 0,
      };
    },
  });
}

/** Returns the current viewer's follow relationship to targetId. */
export function useFollowStatus(viewerId?: string | null, targetId?: string | null) {
  return useQuery({
    queryKey: ["follow-status", viewerId, targetId],
    enabled: !!viewerId && !!targetId && viewerId !== targetId,
    queryFn: async (): Promise<FollowStatus> => {
      if (!viewerId || !targetId) return "none";
      const { data } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", viewerId)
        .eq("following_id", targetId)
        .maybeSingle();
      return (data?.status as FollowStatus | undefined) ?? "none";
    },
  });
}

/** Can the viewer see private content (sprit_proofs, photos) of target? */
export function useCanViewProfile(
  viewerId: string | null | undefined,
  targetId: string | null | undefined,
  isPublic: boolean | undefined,
) {
  const sameUser = !!viewerId && viewerId === targetId;
  const { data: status } = useFollowStatus(viewerId, targetId);
  if (sameUser) return true;
  if (isPublic) return true;
  return status === "accepted";
}

export function useFollowMutations(viewerId: string | null | undefined, targetId: string) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["follow-status", viewerId, targetId] });
    qc.invalidateQueries({ queryKey: ["follow-stats", targetId] });
    qc.invalidateQueries({ queryKey: ["follow-stats", viewerId] });
    qc.invalidateQueries({ queryKey: ["follow-requests-incoming", viewerId] });
    qc.invalidateQueries({ queryKey: ["follow-requests-incoming", targetId] });
  };

  const follow = useMutation({
    mutationFn: async () => {
      if (!viewerId) throw new Error("Trebuie să fii logat");
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: viewerId, following_id: targetId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unfollow = useMutation({
    mutationFn: async () => {
      if (!viewerId) throw new Error("Trebuie să fii logat");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", viewerId)
        .eq("following_id", targetId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { follow, unfollow };
}

export type IncomingRequest = {
  id: string;
  follower_id: string;
  created_at: string;
  follower: {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function useIncomingFollowRequests(userId?: string | null) {
  return useQuery({
    queryKey: ["follow-requests-incoming", userId],
    enabled: !!userId,
    queryFn: async (): Promise<IncomingRequest[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("follows")
        .select("id, follower_id, created_at, follower:profiles!follows_follower_id_fkey(id, handle, display_name, avatar_url)")
        .eq("following_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback in case the FK alias isn't recognized: fetch separately.
        const { data: rows } = await supabase
          .from("follows")
          .select("id, follower_id, created_at")
          .eq("following_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (!rows || rows.length === 0) return [];
        const ids = rows.map((r) => r.follower_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url")
          .in("id", ids);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
        return rows.map((r) => ({ ...r, follower: map.get(r.follower_id) ?? null })) as any;
      }
      return (data ?? []) as any;
    },
  });
}

export function useRequestActions(userId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["follow-requests-incoming", userId] });
    qc.invalidateQueries({ queryKey: ["follow-stats", userId] });
  };

  const accept = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase
        .from("follows")
        .update({ status: "accepted" })
        .eq("id", followId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (followId: string) => {
      const { error } = await supabase.from("follows").delete().eq("id", followId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { accept, reject };
}
