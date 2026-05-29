import { supabase } from "@/integrations/supabase/client";

/**
 * Find or create a 1-on-1 DM conversation between current user and otherUserId.
 * Returns the conversation id.
 */
export async function openOrCreateDM(meId: string, otherUserId: string): Promise<string> {
  // Look for an existing DM between exactly these two users
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversations:conversation_id(kind)")
    .eq("user_id", meId);
  const dmIds = (mine ?? []).filter((m: any) => m.conversations?.kind === "dm").map(m => m.conversation_id);
  if (dmIds.length) {
    const { data: matches } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", dmIds);
    if (matches && matches.length) return matches[0].conversation_id;
  }
  // Create new DM
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ kind: "dm", created_by: meId })
    .select("id")
    .single();
  if (error || !conv) throw error ?? new Error("conv create failed");
  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conv.id, user_id: meId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);
  if (memErr) throw memErr;
  return conv.id;
}

export async function createGroupChat(meId: string, title: string, memberIds: string[], partyId?: string): Promise<string> {
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ kind: partyId ? "party" : "group", title, created_by: meId, party_id: partyId ?? null })
    .select("id")
    .single();
  if (error || !conv) throw error ?? new Error("conv create failed");
  const ids = Array.from(new Set([meId, ...memberIds]));
  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert(ids.map(id => ({ conversation_id: conv.id, user_id: id })));
  if (memErr) throw memErr;
  return conv.id;
}
