import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  launchCampaignForBusiness,
  recordCampaignEventForUser,
} from "@/lib/business-promotion.server";

type LaunchResult = { campaign: { id: string; [k: string]: unknown } } | { error: string };
type TrackResult = { ok: boolean } | { error: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export const launchBusinessCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const data = input as { businessId?: unknown; campaign?: unknown };
    if (typeof data.businessId !== "string" || !UUID_RE.test(data.businessId))
      throw new Error("Invalid businessId");
    if (!data.campaign || typeof data.campaign !== "object" || Array.isArray(data.campaign))
      throw new Error("Invalid campaign");
    return { businessId: data.businessId, campaign: data.campaign as Record<string, unknown> };
  })
  .handler(async ({ data, context }): Promise<LaunchResult> => {
    return launchCampaignForBusiness({
      userId: context.userId,
      businessId: data.businessId,
      campaign: data.campaign,
    });
  });

export const recordCampaignEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const data = input as { campaignId?: unknown; eventType?: unknown };
    if (typeof data.campaignId !== "string" || !UUID_RE.test(data.campaignId))
      throw new Error("Invalid campaignId");
    if (!["impression", "view_detail", "click"].includes(String(data.eventType)))
      throw new Error("Invalid eventType");
    return { campaignId: data.campaignId, eventType: String(data.eventType) };
  })
  .handler(async ({ data, context }): Promise<TrackResult> => {
    return recordCampaignEventForUser({
      userId: context.userId,
      campaignId: data.campaignId,
      eventType: data.eventType,
    });
  });
