import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { moderateMedia, moderateText } from "@/lib/moderation.functions";
import { archivo, hind, SHEET_BOTTOM } from "./shared";
import { errorMessage } from "@/lib/errors";

export function UploadSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const modMedia = useServerFn(moderateMedia);
  const modText = useServerFn(moderateText);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  type VenueLite = { id: string; name: string; slug?: string; city?: { name: string } | null };
  const [selectedVenue, setSelectedVenue] = useState<VenueLite | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: venues } = useQuery({
    queryKey: ["venues-search", venueQuery],
    queryFn: async () => {
      const q = supabase.from("venues").select("id, name, slug, city:cities(name)").limit(8);
      const { data } = venueQuery.trim()
        ? await q.ilike("name", `%${venueQuery.trim()}%`)
        : await q.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function submit() {
    if (!user) {
      toast.error("Trebuie să fii logat.");
      return;
    }
    if (!file) {
      toast.error("Alege o poză sau un clip.");
      return;
    }
    if (!selectedVenue) {
      toast.error("Alege locația.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("venue-photos")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);

      // AI moderation (skip videos — only image+caption)
      const isVideo = file.type.startsWith("video/");
      const trimmedCaption = caption.trim();
      try {
        if (!isVideo) {
          const v = await modMedia({ data: { imageUrl: pub.publicUrl, caption: trimmedCaption || null } });
          if (!v.allowed) {
            await supabase.storage.from("venue-photos").remove([path]);
            toast.error(v.reason || "Conținut respins de moderare");
            return;
          }
        } else if (trimmedCaption) {
          const v = await modText({ data: { text: trimmedCaption } });
          if (!v.allowed) {
            await supabase.storage.from("venue-photos").remove([path]);
            toast.error(v.reason || "Descrierea nu respectă regulile");
            return;
          }
        }
      } catch {
        // moderation is best-effort; continue if it fails
      }

      const { error: insErr } = await supabase.from("venue_photos").insert({
        user_id: user.id,
        venue_id: selectedVenue.id,
        photo_url: pub.publicUrl,
        caption: trimmedCaption || null,
        media_type: isVideo ? "video" : "image",
      });
      if (insErr) throw insErr;
      toast.success("Faza ta e live.");
      qc.invalidateQueries({ queryKey: ["faze"] });
      qc.invalidateQueries({ queryKey: ["app-feed"] });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, "Eroare la upload"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center px-2"
      onClick={onClose}
      style={{ ...hind, paddingBottom: SHEET_BOTTOM, paddingTop: "1rem" }}
    >
      <div
        className="w-full max-w-[22rem] bg-background border border-foreground/10 rounded-3xl p-4 space-y-3 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(100dvh - ${SHEET_BOTTOM} - 2rem)` }}
      >
        <div className="flex items-center justify-between">
          <div className="uppercase text-sm tracking-[0.16em]" style={archivo}>
            Postează o fază
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground text-2xl leading-none w-8 h-8 grid place-items-center"
          >
            ×
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full aspect-[4/3] rounded-2xl border border-dashed border-foreground/20 flex items-center justify-center overflow-hidden bg-foreground/[0.04]"
        >
          {file ? (
            file.type.startsWith("video/") ? (
              <video
                src={URL.createObjectURL(file)}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
                loop
              />
            ) : (
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="text-center space-y-1 text-muted-foreground">
              <div className="text-3xl">📸 🎬</div>
              <div className="text-[10px] uppercase tracking-widest" style={archivo}>
                alege poză sau clip
              </div>
            </div>
          )}
        </button>

        <div className="space-y-1.5">
          <label
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
            style={archivo}
          >
            Locația
          </label>
          {selectedVenue ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-foreground/[0.06] border border-foreground/10">
              <div className="text-[13px] truncate">
                {selectedVenue.name} · {selectedVenue.city?.name ?? ""}
              </div>
              <button
                onClick={() => setSelectedVenue(null)}
                className="text-[10px] text-sunset-orange uppercase ml-2 shrink-0"
                style={archivo}
              >
                schimbă
              </button>
            </div>
          ) : (
            <>
              <input
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                placeholder="caută un club, bar, terasă..."
                className="w-full p-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-[13px]"
              />
              <div className="max-h-32 overflow-y-auto space-y-0.5 mt-1">
                {(venues ?? []).map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVenue(v)}
                    className="w-full text-left p-2 rounded-lg hover:bg-foreground/[0.06] text-[13px]"
                  >
                    <div className="font-semibold">{v.name}</div>
                    <div
                      className="text-[10px] uppercase tracking-widest text-muted-foreground"
                      style={archivo}
                    >
                      {v.city?.name ?? ""}
                    </div>
                  </button>
                ))}
                {venues && venues.length === 0 && (
                  <div className="text-[11px] text-muted-foreground p-2">Nicio locație găsită.</div>
                )}
              </div>
            </>
          )}
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Spune ceva despre fază... (opțional)"
          rows={2}
          className="w-full p-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-[13px] resize-none"
        />

        <button
          onClick={submit}
          disabled={uploading || !file || !selectedVenue}
          className="w-full uppercase text-[13px] tracking-[0.18em] py-3 rounded-xl text-white disabled:opacity-40 active:scale-[0.98] transition"
          style={{ ...archivo, background: "var(--gradient-sunset)" }}
        >
          {uploading ? "Se postează..." : "Postează"}
        </button>
      </div>
    </div>
  );
}
