import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Star, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

/**
 * Real, working business review widget.
 * - Reads the live rating & review count from `business_reviews`.
 * - Lets the logged-in user submit / update their own 1-5 stars + comment.
 * - One row per user per business (DB unique constraint); we upsert.
 */
export function BusinessReviewCard({
  businessId,
  brandName,
}: {
  businessId: string;
  brandName?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["biz-reviews", businessId, user?.id ?? "anon"],
    queryFn: async () => {
      const [all, mine] = await Promise.all([
        supabase
          .from("business_reviews")
          .select("rating, comment, created_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(20),
        user
          ? supabase
              .from("business_reviews")
              .select("rating, comment")
              .eq("business_id", businessId)
              .eq("reviewer_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
      ]);
      return { all: all.data ?? [], mine: mine.data ?? null };
    },
    enabled: !!businessId,
  });

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.mine) {
      setRating(data.mine.rating ?? 0);
      setComment(data.mine.comment ?? "");
    }
  }, [data?.mine]);

  const avg = useMemo(() => {
    if (!data?.all.length) return 0;
    return data.all.reduce((s, r) => s + (r.rating || 0), 0) / data.all.length;
  }, [data?.all]);

  const submit = async () => {
    if (!user) {
      toast.error("Trebuie să fii logat ca să dai rating");
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error("Alege între 1 și 5 stele");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("business_reviews").upsert(
      {
        business_id: businessId,
        reviewer_id: user.id,
        rating,
        comment: comment.trim() || null,
      },
      { onConflict: "business_id,reviewer_id" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(data?.mine ? "Rating actualizat" : "Rating trimis");
    qc.invalidateQueries({ queryKey: ["biz-reviews", businessId] });
    qc.invalidateQueries({ queryKey: ["biz-command", businessId] });
  };

  const stars = (n: number, size = 16, colorClass = "text-sunset-amber") =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < n ? `${colorClass} fill-current` : "text-zinc-700"}
      />
    ));

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/60 backdrop-blur-xl p-4 space-y-4">
      {/* Header / current rating */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
            Rating real
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-2xl leading-none tabular-nums text-sunset-amber">
              {avg ? avg.toFixed(2) : "—"}
            </span>
            <div className="flex items-center gap-0.5">{stars(Math.round(avg))}</div>
            <span className="text-[11px] text-zinc-500">({data?.all.length ?? 0})</span>
          </div>
        </div>
      </div>

      {/* Submit form */}
      {user ? (
        <div className="space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            {data?.mine ? "Ratingul tău" : `Dă rating${brandName ? ` lui ${brandName}` : ""}`}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => {
              const n = i + 1;
              const active = (hover || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="p-1 transition-transform active:scale-90"
                  aria-label={`${n} stele`}
                >
                  <Star
                    size={28}
                    className={
                      active
                        ? "text-sunset-amber fill-current drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                        : "text-zinc-700"
                    }
                  />
                </button>
              );
            })}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Spune ceva despre experiența ta (opțional)…"
            rows={2}
            className="w-full rounded-xl bg-zinc-900/60 border border-white/5 px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-sunset-amber/40 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">{comment.length}/500</span>
            <button
              onClick={submit}
              disabled={busy || rating === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-display uppercase tracking-widest text-white disabled:opacity-50"
              style={{ background: "var(--gradient-sunset)" }}
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {data?.mine ? "Actualizează" : "Trimite"}
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/login"
          className="block text-center text-[11px] py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:border-sunset-amber/40 hover:text-sunset-amber"
        >
          Conectează-te ca să dai rating
        </Link>
      )}

      {/* Recent reviews */}
      {!isLoading && data?.all && data.all.length > 0 && (
        <div className="pt-3 border-t border-white/5 space-y-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
            Ultimele păreri
          </div>
          {data.all.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <div className="flex items-center gap-0.5 mt-[2px]">{stars(r.rating, 10)}</div>
              <div className="flex-1 min-w-0">
                {r.comment && <div className="text-zinc-300 break-words">"{r.comment}"</div>}
                <div className="text-[9px] text-zinc-600">
                  {new Date(r.created_at).toLocaleDateString("ro-RO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
