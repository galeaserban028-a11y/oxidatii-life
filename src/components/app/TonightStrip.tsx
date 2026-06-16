import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Moon, Check, Plus } from "lucide-react";

type TonightFriend = {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  note: string | null;
  venue_id: string | null;
  venue_name: string | null;
  current_streak: number;
  is_checked_in: boolean;
  set_at: string;
};

function todayBucharest(): string {
  const buc = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }),
  );
  return buc.toISOString().slice(0, 10);
}

export function TonightStrip() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = todayBucharest();

  // my intent
  const { data: myIntent } = useQuery({
    queryKey: ["my-tonight", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("tonight_intents")
        .select("*")
        .eq("user_id", user!.id)
        .eq("intent_date", today)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  // friends tonight
  const { data: friends = [] } = useQuery({
    queryKey: ["tonight-friends", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tonight_friends", {
        _date: today,
      });
      if (error) throw error;
      return (data ?? []) as TonightFriend[];
    },
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const goingOut = !!myIntent;

  async function toggle() {
    if (!user) return;
    if (goingOut) {
      const { error } = await supabase.rpc("clear_tonight_intent", {
        _date: today,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Am scos — poate altă seară 🌙");
    } else {
      const { error } = await supabase.rpc("set_tonight_intent", {
        _date: today,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Ești pe listă pentru diseară 🍻");
    }
    qc.invalidateQueries({ queryKey: ["my-tonight"] });
    qc.invalidateQueries({ queryKey: ["tonight-friends"] });
  }

  const count = friends.length + (goingOut ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 flex items-center gap-2">
            <Moon size={11} className="text-[#6c5ce7]" />
            Seara asta
          </div>
          <div
            className="text-[22px] leading-none text-white mt-1"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {count === 0 ? (
              <>Nimeni încă... <span className="italic text-white/40">fii primul</span></>
            ) : count === 1 && goingOut ? (
              <>Doar tu deocamdată</>
            ) : (
              <>
                <span className="italic text-[#f7931e]">{count}</span>{" "}
                {count === 1 ? "prieten iese" : "prieteni ies"}
              </>
            )}
          </div>
        </div>
        <button
          onClick={toggle}
          className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider active:scale-[0.96] transition-transform shrink-0"
          style={{
            background: goingOut
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, #ff6b35, #e84393)",
            color: goingOut ? "rgba(255,255,255,0.9)" : "#000",
            border: goingOut ? "1px solid rgba(255,255,255,0.15)" : "none",
          }}
        >
          {goingOut ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} strokeWidth={3} /> Ies diseară
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Plus size={12} strokeWidth={3} /> Ies diseară
            </span>
          )}
        </button>
      </div>

      {friends.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-none">
          {friends.map((f) => (
            <Link
              key={f.user_id}
              to="/app/user/$id"
              params={{ id: f.handle ?? f.user_id }}
              className="shrink-0 w-[120px] rounded-2xl border border-white/10 bg-[#111] p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
            >
              <div className="relative">
                <div
                  className="h-14 w-14 rounded-full p-[2px]"
                  style={{
                    background: f.is_checked_in
                      ? "linear-gradient(135deg, #ff6b35, #e84393)"
                      : "rgba(255,255,255,0.15)",
                  }}
                >
                  {f.avatar_url ? (
                    <img
                      src={f.avatar_url}
                      alt={f.display_name ?? ""}
                      className="h-full w-full rounded-full object-cover bg-black"
                    />
                  ) : (
                    <div className="h-full w-full rounded-full bg-[#1a1a1a] flex items-center justify-center text-base text-white/60">
                      {f.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
                {f.is_checked_in && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#111] bg-emerald-400"
                    style={{ boxShadow: "0 0 6px rgba(52,211,153,0.7)" }}
                  />
                )}
                {f.current_streak >= 4 && (
                  <span className="absolute -top-1 -left-1 text-[10px]">🔥</span>
                )}
              </div>
              <div className="text-center w-full min-w-0">
                <div className="text-[11px] font-semibold text-white truncate">
                  @{f.handle ?? f.display_name}
                </div>
                <div className="text-[9px] text-white/40 truncate">
                  {f.is_checked_in
                    ? f.venue_name ?? "Pe teren acum"
                    : f.venue_name
                      ? f.venue_name
                      : "iese diseară"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
