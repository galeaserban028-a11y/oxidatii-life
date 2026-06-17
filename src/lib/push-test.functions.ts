import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushToUsers } from "./push-send.server";

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const res = await sendPushToUsers([context.userId], {
      title: "✅ Test OXIDAȚII",
      body: "Notificările push funcționează pe acest dispozitiv.",
      url: "/app/settings",
      tag: "test-push",
    });
    return res;
  });
