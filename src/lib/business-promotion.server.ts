import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CampaignInput = Record<string, unknown>;

const ACTIVE_CAMPAIGN_KINDS = new Set(["boost_feed", "boost_story", "boost_discover"]);
const ACTIVE_EVENT_TYPES = new Set(["impression", "view_detail", "click"]);

const UUID_RE = /^[0-9a-f-]{36}$/i;

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function url(value: unknown): string | null {
  const raw = text(value, 500);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function imageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && /^https?:\/\//.test(v)).slice(0, 4);
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function refundCampaignBudget(businessId: string, budgetCents: number) {
  const { data: biz } = await supabaseAdmin
    .from("business_accounts")
    .select("wallet_balance_cents")
    .eq("id", businessId)
    .maybeSingle();
  await supabaseAdmin
    .from("business_accounts")
    .update({ wallet_balance_cents: ((biz?.wallet_balance_cents as number | undefined) ?? 0) + budgetCents })
    .eq("id", businessId);
}

export async function launchCampaignForBusiness(options: {
  userId: string;
  businessId: string;
  campaign: CampaignInput;
}) {
  const { userId, businessId, campaign } = options;
  const kind = text(campaign.kind, 40) ?? "boost_feed";
  if (!ACTIVE_CAMPAIGN_KINDS.has(kind)) return { error: "Alege un tip de promovare disponibil acum." };

  const title = text(campaign.title, 50);
  if (!title) return { error: "Adaugă un titlu pentru reclamă." };

  const budgetCents = int(campaign.budget_cents, 0, 5000, 10000000);
  if (budgetCents < 5000) return { error: "Bugetul minim este 50 RON." };

  const { data: biz, error: bizError } = await supabaseAdmin
    .from("business_accounts")
    .select("id, owner_user_id, wallet_balance_cents")
    .eq("id", businessId)
    .maybeSingle();
  if (bizError || !biz) return { error: "Business inexistent." };
  if (biz.owner_user_id !== userId) return { error: "Nu ai acces la acest business." };

  const currentWallet = (biz.wallet_balance_cents as number | undefined) ?? 0;
  if (currentWallet < budgetCents) return { error: "Wallet insuficient pentru această campanie." };

  const { data: debited, error: debitError } = await supabaseAdmin
    .from("business_accounts")
    .update({ wallet_balance_cents: currentWallet - budgetCents })
    .eq("id", businessId)
    .gte("wallet_balance_cents", budgetCents)
    .select("wallet_balance_cents")
    .maybeSingle();
  if (debitError || !debited) return { error: "Wallet insuficient pentru această campanie." };

  const entryKindRaw = String(campaign.entry_kind ?? "");
  const payload: any = {
    business_id: businessId,
    kind,
    party_id: uuid(campaign.party_id),
    venue_id: uuid(campaign.venue_id),
    city_id: uuid(campaign.city_id),
    title,
    subtitle: text(campaign.subtitle, 80),
    cta_text: text(campaign.cta_text, 15) ?? "Vezi detalii",
    cta_url: url(campaign.cta_url),
    image_urls: imageUrls(campaign.image_urls),
    theme_color: text(campaign.theme_color, 20) ?? "#FF2D55",
    video_url: url(campaign.video_url),
    event_starts_at: isoDate(campaign.event_starts_at),
    entry_kind: ["free", "paid"].includes(entryKindRaw) ? entryKindRaw : null,
    entry_price_text: text(campaign.entry_price_text, 40),
    street: text(campaign.street, 120),
    special_guest: text(campaign.special_guest, 80),
    status: "active",
    bid_cents: int(campaign.bid_cents, 150, 1, 2000),
    budget_cents: budgetCents,
    daily_cap_cents: int(campaign.daily_cap_cents, 0, 0, budgetCents),
    pricing_model: "cpm",
    starts_at: isoDate(campaign.starts_at) ?? new Date().toISOString(),
    ends_at: isoDate(campaign.ends_at),
    targeting: jsonObject(campaign.targeting),
    schedule: jsonObject(campaign.schedule),
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("campaigns")
    .insert(payload)
    .select("*")
    .single();
  if (insertError || !inserted) {
    await refundCampaignBudget(businessId, budgetCents);
    return { error: insertError?.message ?? "Campania nu a putut fi lansată." };
  }

  const { error: ledgerError } = await supabaseAdmin.from("wallet_ledger").insert({
    business_id: businessId,
    kind: "spend",
    amount_cents: -budgetCents,
    campaign_id: inserted.id,
    note: `campaign:${inserted.id}`,
  });
  if (ledgerError) {
    // Campania rămâne activă; ledger-ul poate fi reparat de admin, dar wallet-ul este deja rezervat.
    console.error("wallet ledger insert failed", ledgerError);
  }

  return { campaign: inserted };
}

export async function recordCampaignEventForUser(options: {
  userId: string;
  campaignId: string;
  eventType: string;
}) {
  const { userId, campaignId, eventType } = options;
  if (!ACTIVE_EVENT_TYPES.has(eventType)) return { error: "Eveniment invalid." };

  const now = new Date();
  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, status, starts_at, ends_at, bid_cents, budget_cents, spent_cents, impressions, clicks")
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !campaign) return { error: "Campanie inexistentă." };
  if (campaign.status !== "active") return { error: "Campanie inactivă." };
  if (new Date(campaign.starts_at) > now || (campaign.ends_at && new Date(campaign.ends_at) <= now)) {
    return { error: "Campanie în afara programului." };
  }

  const costCents = eventType === "impression" ? ((campaign.bid_cents as number | undefined) ?? 0) : 0;
  const spentCents = (campaign.spent_cents as number | undefined) ?? 0;
  const budgetCents = (campaign.budget_cents as number | undefined) ?? 0;
  if (costCents > 0 && spentCents + costCents > budgetCents) {
    await supabaseAdmin.from("campaigns").update({ status: "exhausted" }).eq("id", campaignId);
    return { error: "Buget epuizat." };
  }

  await supabaseAdmin.from("campaign_events").insert({
    campaign_id: campaignId,
    user_id: userId,
    event_type: eventType,
    cost_cents: costCents,
  });

  const nextImpressions = ["impression", "view_detail"].includes(eventType)
    ? ((campaign.impressions as number | undefined) ?? 0) + 1
    : ((campaign.impressions as number | undefined) ?? 0);
  const nextClicks = eventType === "click"
    ? ((campaign.clicks as number | undefined) ?? 0) + 1
    : ((campaign.clicks as number | undefined) ?? 0);
  const nextSpent = spentCents + costCents;

  await supabaseAdmin.from("campaigns").update({
    impressions: nextImpressions,
    clicks: nextClicks,
    spent_cents: nextSpent,
    ...(budgetCents > 0 && nextSpent >= budgetCents ? { status: "exhausted" } : {}),
  }).eq("id", campaignId);

  return { ok: true as const };
}