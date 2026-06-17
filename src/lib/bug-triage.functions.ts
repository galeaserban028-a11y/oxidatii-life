import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({
  reportId: z.string().uuid(),
});

/**
 * AI-triage a bug_report: classify it, write a friendly resolution note,
 * and auto-resolve cosmetic / duplicate / unclear reports.
 * Admin still sees the row and can override.
 */
export const triageBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: report, error: fetchErr } = await supabase
      .from("reports")
      .select("id, reason, details, status, target_type, reporter_id")
      .eq("id", data.reportId)
      .maybeSingle();

    if (fetchErr || !report) {
      return { ok: false as const, error: "report_not_found" };
    }
    if (report.reporter_id !== userId) {
      return { ok: false as const, error: "forbidden" };
    }
    if (report.target_type !== "bug_report") {
      return { ok: false as const, error: "not_a_bug_report" };
    }
    if (report.status && report.status !== "pending" && report.status !== "open") {
      return { ok: true as const, alreadyTriaged: true };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "ai_unavailable" };
    }

    const prompt = [
      "You triage bug reports for a Romanian nightlife social app called OXIDAȚII.",
      "Reply ONLY with strict JSON, no markdown, matching:",
      '{"category":"bug|ux|feature_request|abuse|duplicate|unclear|other","severity":"low|medium|high|critical","auto_resolve":true|false,"reply_ro":"short friendly Romanian reply (max 320 chars)"}',
      "Rules:",
      "- auto_resolve=true only for: unclear, duplicate, feature_request, low-severity ux.",
      "- For real bugs (crash, data loss, payments, auth, push) -> severity high/critical, auto_resolve=false.",
      "- reply_ro must thank the user and explain next step in plain Romanian.",
      "",
      `Reason: ${report.reason}`,
      `Details: ${report.details ?? "(none)"}`,
    ].join("\n");

    let aiJson: {
      category: string;
      severity: string;
      auto_resolve: boolean;
      reply_ro: string;
    } | null = null;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a precise triage assistant. Output only JSON." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[triage] ai gateway error", res.status, txt);
        return { ok: false as const, error: `ai_${res.status}` };
      }
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      aiJson = JSON.parse(content);
    } catch (e) {
      console.error("[triage] parse error", e);
      return { ok: false as const, error: "ai_parse" };
    }

    if (!aiJson) return { ok: false as const, error: "ai_empty" };

    const category = String(aiJson.category ?? "other").slice(0, 32);
    const severity = String(aiJson.severity ?? "medium").slice(0, 16);
    const reply = String(aiJson.reply_ro ?? "Mulțumim, raportul tău a ajuns la echipă.").slice(0, 600);
    const autoResolve = Boolean(aiJson.auto_resolve);

    const resolutionNote = `[AI triage] category=${category} severity=${severity}\n${reply}`;

    // Use admin client to override RLS on resolution columns (reporter can't normally set them)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nextStatus = autoResolve
      ? "resolved"
      : severity === "critical" || severity === "high"
        ? "urgent"
        : "triaged";

    const { error: updErr } = await supabaseAdmin
      .from("reports")
      .update({
        resolution_note: resolutionNote,
        status: nextStatus,
        resolved_at: autoResolve ? new Date().toISOString() : null,
      })
      .eq("id", data.reportId);

    if (updErr) {
      console.error("[triage] update error", updErr);
      return { ok: false as const, error: "db_update" };
    }

    return {
      ok: true as const,
      category,
      severity,
      reply,
      autoResolved: autoResolve,
    };
  });
