import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Lock,
  MapPin,
  Bell,
  ShieldOff,
  UserPlus,
  Pencil,
  LogOut,
  Trash2,
  MessageSquare,
  Building2,
  Loader2,
  ExternalLink,
  Bug,
  FileText,
  ScrollText,
  Cookie,
  ShieldCheck,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { triageBugReport } from "@/lib/bug-triage.functions";
import { NotificationSettings } from "@/components/app/NotificationSettings";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import { errorMessage } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Setări · OXIDAȚII" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [savingCity, setSavingCity] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [bugReason, setBugReason] = useState("");
  const [bugDetails, setBugDetails] = useState("");
  const [bugSending, setBugSending] = useState(false);
  const [msgKind, setMsgKind] = useState<null | "support" | "contact">(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgSending, setMsgSending] = useState(false);

  const triage = useServerFn(triageBugReport);

  async function sendMessage() {
    if (!msgKind) return;
    if (!msgSubject.trim()) return toast.error("Adaugă un subiect scurt");
    if (!msgBody.trim()) return toast.error("Scrie mesajul");
    setMsgSending(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user!.id,
        target_type: msgKind === "support" ? "support_feedback" : "contact_team",
        target_id: user!.id,
        reason: msgSubject.trim().slice(0, 200),
        details: [
          msgBody.trim().slice(0, 4000),
          `--- context ---`,
          `kind: ${msgKind}`,
          `url: ${window.location.href}`,
          `user: ${user!.email ?? user!.id}`,
        ].join("\n"),
      });
      if (error) throw error;
      toast.success("Mesaj trimis către echipă. Mulțumim!");
      setMsgKind(null);
      setMsgSubject("");
      setMsgBody("");
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut trimite"));
    } finally {
      setMsgSending(false);
    }
  }

  async function sendBugReport() {
    if (!bugReason.trim()) return toast.error("Spune pe scurt ce nu merge");
    setBugSending(true);
    try {
      const { data: inserted, error } = await supabase
        .from("reports")
        .insert({
          reporter_id: user!.id,
          target_type: "bug_report",
          target_id: user!.id,
          reason: bugReason.trim().slice(0, 200),
          details: [
            bugDetails.trim().slice(0, 2000),
            `--- context ---`,
            `url: ${window.location.href}`,
            `ua: ${navigator.userAgent}`,
            `screen: ${window.innerWidth}x${window.innerHeight}`,
            `user: ${user!.email ?? user!.id}`,
          ]
            .filter(Boolean)
            .join("\n"),
        })
        .select("id")
        .single();
      if (error) throw error;

      // Fire-and-await AI triage so the user gets the auto-reply right away
      try {
        const res = await triage({ data: { reportId: inserted.id } });
        if (res?.ok && "reply" in res && res.reply) {
          toast.success(res.reply, { duration: 8000 });
        } else {
          toast.success("Mulțumim! Raportul a ajuns la echipă.");
        }
      } catch {
        toast.success("Mulțumim! Raportul a ajuns la echipă.");
      }

      setBugOpen(false);
      setBugReason("");
      setBugDetails("");
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut trimite"));
    } finally {
      setBugSending(false);
    }
  }

  type CityLite = { id: string; name: string; slug: string };

  const { data: cities = [] } = useQuery({
    queryKey: ["cities-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id, name, slug").order("name");
      return data ?? [];
    },
  });

  const currentCity = (cities as CityLite[]).find((c) => c.id === profile?.city_id);

  if (!user || !profile) return null;

  async function togglePrivacy() {
    setSavingPrivacy(true);
    try {
      const next = !profile!.is_public;
      const { error } = await supabase
        .from("profiles")
        .update({ is_public: next })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(next ? "Cont public" : "Cont privat");
    } catch (e) {
      toast.error(errorMessage(e, "Eroare"));
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function toggleConsent() {
    setSavingConsent(true);
    try {
      const next = !profile!.location_consent;
      const { error } = await supabase
        .from("profiles")
        .update({ location_consent: next })
        .eq("id", user!.id);
      if (error) throw error;
      // If turning off, also clear any broadcast row immediately
      if (!next) await supabase.from("live_locations").delete().eq("user_id", user!.id);
      await refreshProfile();
      toast.success(next ? "Locație live activată" : "Locație live oprită");
    } catch (e) {
      toast.error(errorMessage(e, "Eroare"));
    } finally {
      setSavingConsent(false);
    }
  }

  async function pickCity(cityId: string) {
    setSavingCity(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ city_id: cityId })
        .eq("id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Oraș actualizat");
      setCityOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Eroare"));
    } finally {
      setSavingCity(false);
    }
  }

  async function doLogout() {
    setConfirmLogout(false);
    await signOut();
    nav({ to: "/", replace: true });
  }

  async function doDeleteAccount() {
    setDeleting(true);
    try {
      // Best-effort cleanup of own rows (RLS allows self delete on these)
      await Promise.all([
        supabase.from("live_locations").delete().eq("user_id", user!.id),
        supabase.from("push_subscriptions").delete().eq("user_id", user!.id),
        supabase.from("check_ins").delete().eq("user_id", user!.id),
        supabase.from("profiles").delete().eq("id", user!.id),
      ]);
      await supabase.auth.signOut();
      toast.success("Cont șters");
      nav({ to: "/", replace: true });
    } catch (e) {
      toast.error(errorMessage(e, "Nu s-a putut șterge"));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-foreground/10 px-3 h-12 flex items-center gap-2">
        <Link to="/app/me" className="p-1.5 -ml-1.5 active:scale-95" aria-label="Înapoi">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="font-display uppercase text-base tracking-tight">Setări</h1>
      </header>

      <div className="px-4 pt-4 space-y-5">
        {/* Account identity */}
        <Section title="Cont" subtitle={`Semnat ca ${user.email ?? "—"}`}>
          <Row
            icon={<Pencil size={16} />}
            label="Editează profilul"
            hint="nume, handle, bio, poză"
            to="/app/me"
          />
          <RowButton
            icon={
              profile.is_public ? (
                <Globe2 size={16} className="text-neon-green" />
              ) : (
                <Lock size={16} className="text-neon-crimson" />
              )
            }
            label="Vizibilitate cont"
            hint={
              profile.is_public ? "Oricine îți vede profilul" : "Doar urmăritorii aprobați te văd"
            }
            onClick={togglePrivacy}
            disabled={savingPrivacy}
            trailing={<Toggle on={profile.is_public} busy={savingPrivacy} />}
          />
          <RowButton
            icon={<Building2 size={16} />}
            label="Oraș principal"
            hint={currentCity?.name ?? "neales"}
            onClick={() => setCityOpen(true)}
            trailing={<ChevronRight size={16} className="text-muted-foreground" />}
          />
        </Section>

        {/* Location live */}
        <Section title="Locație" subtitle="Cum apari pe hartă">
          <RowButton
            icon={
              <MapPin
                size={16}
                className={profile.location_consent ? "text-neon-green" : "text-muted-foreground"}
              />
            }
            label="Poziție live pe hartă"
            hint={
              profile.location_consent
                ? "Prietenii tăi te văd mișcându-te în timp real"
                : "Nu trimiți poziția. Apari doar la check-in."
            }
            onClick={toggleConsent}
            disabled={savingConsent}
            trailing={<Toggle on={profile.location_consent} busy={savingConsent} />}
          />
          <p className="px-4 pb-3 pt-1 text-[10px] text-muted-foreground leading-relaxed">
            Trimitem coordonatele tale doar cât stai în app și se șterg automat după 15 min. Doar
            prietenii cu cerere acceptată le pot vedea.
          </p>
        </Section>

        {/* Language switcher */}
        <div className="px-4 pt-2">
          <LanguageSwitcher />
        </div>

        {/* Notifications — reuses the existing component */}
        <NotificationSettings />

        {/* Privacy / safety */}
        <Section title="Confidențialitate">
          <Row icon={<UserPlus size={16} />} label="Cereri de urmărire" to="/app/requests" />
          <Row icon={<ShieldOff size={16} />} label="Utilizatori blocați" to="/app/blocked" />
          <Row icon={<Bell size={16} />} label="Notificări primite" to="/app/notifications" />
          <Row icon={<MessageSquare size={16} />} label="Mesaje" to="/app/inbox" />
        </Section>

        {/* Legal */}
        <Section title="Legal" subtitle="Documente și GDPR">
          <RowExternalLink
            icon={<ShieldCheck size={16} />}
            href="/privacy"
            label="Politica de confidențialitate"
            hint="Ce date colectăm, drepturile tale (GDPR)"
          />
          <RowExternalLink
            icon={<ScrollText size={16} />}
            href="/terms"
            label="Termeni și condiții"
            hint="Reguli de folosire a aplicației"
          />
          <RowExternalLink
            icon={<Cookie size={16} />}
            href="/cookies"
            label="Politica de cookies"
            hint="Cookie-uri și cum le gestionezi"
          />
          <RowExternalLink
            icon={<FileText size={16} />}
            href="mailto:privacy@oxidatii.life"
            label="Cere ștergerea datelor"
            hint="Trimite-ne un email și răspundem în 30 de zile"
          />
        </Section>

        {/* About */}
        <Section title="Despre">
          <RowButton
            icon={<Bug size={16} className="text-neon-crimson" />}
            label="Raportează o problemă"
            hint="Trimite un bug sau o sugestie către echipă"
            onClick={() => setBugOpen(true)}
          />
          <RowButton
            icon={<ExternalLink size={16} />}
            label="Suport & feedback"
            hint="Trimite-ne ce te ajută/ce nu merge — ajunge direct la echipă"
            onClick={() => {
              setMsgKind("support");
              setMsgSubject("");
              setMsgBody("");
            }}
          />
          <RowButton
            icon={<FileText size={16} />}
            label="Contact echipă"
            hint="Răspundem în maxim 2 zile lucrătoare"
            onClick={() => {
              setMsgKind("contact");
              setMsgSubject("");
              setMsgBody("");
            }}
          />

          <div className="px-4 py-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>Versiune</span>
            <span>oxidatii · v1.0</span>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Sesiune" tone="danger">
          <RowButton
            icon={<LogOut size={16} className="text-neon-crimson" />}
            label="Ieși din cont"
            onClick={() => setConfirmLogout(true)}
            tone="danger"
          />
          <RowButton
            icon={<Trash2 size={16} className="text-neon-crimson" />}
            label="Șterge contul"
            hint="Profil, locație, abonări push — ireversibil"
            onClick={() => setConfirmDelete(true)}
            tone="danger"
          />
        </Section>
      </div>

      {/* City picker */}
      <Dialog
        open={cityOpen}
        onOpenChange={(v) => {
          setCityOpen(v);
          if (!v) setCitySearch("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Alege oraș</DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="Caută oraș..."
              className="w-full bg-foreground/5 rounded-xl pl-9 pr-8 py-2.5 text-sm border border-foreground/10 focus:border-foreground/30 outline-none"
            />
            {citySearch && (
              <button
                onClick={() => setCitySearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-[50vh] overflow-y-auto -mx-2">
            {cities
              .filter((c: CityLite) =>
                c.name.toLowerCase().includes(citySearch.toLowerCase().trim()),
              )
              .map((c: CityLite) => {
                const selected = c.id === profile.city_id;
                return (
                  <button
                    key={c.id}
                    onClick={() => pickCity(c.id)}
                    disabled={savingCity}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${selected ? "bg-neon-green/10 text-neon-green" : "hover:bg-foreground/5"}`}
                  >
                    <Building2 size={15} />
                    <span className="text-sm flex-1">{c.name}</span>
                    {selected && <span className="text-[10px] font-mono uppercase">activ</span>}
                  </button>
                );
              })}
            {(cities as CityLite[]).filter((c) =>
              c.name.toLowerCase().includes(citySearch.toLowerCase().trim()),
            ).length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Niciun oraș găsit
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bug report */}
      <Dialog open={bugOpen} onOpenChange={setBugOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <Bug size={16} className="text-neon-crimson" /> Raportează o problemă
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <input
              autoFocus
              value={bugReason}
              onChange={(e) => setBugReason(e.target.value)}
              placeholder="Ce nu merge? (scurt)"
              maxLength={200}
              className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-neon-crimson outline-none"
            />
            <textarea
              value={bugDetails}
              onChange={(e) => setBugDetails(e.target.value)}
              placeholder="Detalii: ce făceai, ce te aștepți să se întâmple…"
              maxLength={2000}
              rows={5}
              className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-neon-crimson outline-none resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Trimitem și ruta curentă, dispozitivul și emailul tău, ca să te poată ajuta echipa.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setBugOpen(false)}
              disabled={bugSending}
              className="px-4 py-2 rounded-lg border border-foreground/15 text-sm"
            >
              Renunță
            </button>
            <button
              onClick={sendBugReport}
              disabled={bugSending}
              className="px-4 py-2 rounded-lg bg-neon-crimson text-white text-sm font-semibold flex items-center gap-1.5"
            >
              {bugSending && <Loader2 size={14} className="animate-spin" />} Trimite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support / Contact message */}
      <Dialog
        open={!!msgKind}
        onOpenChange={(v) => {
          if (!v) setMsgKind(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              {msgKind === "support" ? (
                <>
                  <ExternalLink size={16} /> Suport & feedback
                </>
              ) : (
                <>
                  <FileText size={16} /> Contact echipă
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <input
              autoFocus
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subiect (scurt)"
              maxLength={200}
              className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-foreground/30 outline-none"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder={
                msgKind === "support"
                  ? "Cu ce te ajutăm? Ce nu merge? Idei?"
                  : "Scrie-ne mesajul tău…"
              }
              maxLength={4000}
              rows={6}
              className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-foreground/30 outline-none resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Mesajul ajunge în panoul echipei. Atașăm și emailul tău ca să te poată contacta.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setMsgKind(null)}
              disabled={msgSending}
              className="px-4 py-2 rounded-lg border border-foreground/15 text-sm"
            >
              Renunță
            </button>
            <button
              onClick={sendMessage}
              disabled={msgSending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold flex items-center gap-1.5"
            >
              {msgSending && <Loader2 size={14} className="animate-spin" />} Trimite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm logout */}
      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">Ieși din cont?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Va trebui să te conectezi din nou ca să vezi haita.
          </p>
          <DialogFooter>
            <button
              onClick={() => setConfirmLogout(false)}
              className="px-4 py-2 rounded-lg border border-foreground/15 text-sm"
            >
              Anulează
            </button>
            <button
              onClick={doLogout}
              className="px-4 py-2 rounded-lg bg-neon-crimson text-white text-sm font-semibold"
            >
              Ieși
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase text-neon-crimson">
              Șterge cont definitiv?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Profilul, poziția live, abonările push și check-in-urile tale dispar. Această acțiune nu
            poate fi anulată.
          </p>
          <DialogFooter>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 rounded-lg border border-foreground/15 text-sm"
              disabled={deleting}
            >
              Renunță
            </button>
            <button
              onClick={doDeleteAccount}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-neon-crimson text-white text-sm font-semibold flex items-center gap-1.5"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Șterge
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── building blocks ───────── */

function Section({
  title,
  subtitle,
  children,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section>
      <div className="px-1 pb-2">
        <h2
          className={`font-display uppercase text-[11px] tracking-[0.25em] ${tone === "danger" ? "text-neon-crimson" : "text-muted-foreground"}`}
        >
          {title}
        </h2>
        {subtitle && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
      </div>
      <div
        className={`rounded-2xl border overflow-hidden divide-y divide-foreground/5 ${tone === "danger" ? "border-neon-crimson/30 bg-neon-crimson/[0.03]" : "border-foreground/10 bg-card"}`}
      >
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  hint,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition active:bg-foreground/10"
    >
      <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </Link>
  );
}

function RowButton({
  icon,
  label,
  hint,
  onClick,
  disabled,
  trailing,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 transition text-left ${tone === "danger" ? "hover:bg-neon-crimson/10" : "hover:bg-foreground/5"} active:bg-foreground/10 disabled:opacity-60`}
    >
      <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${tone === "danger" ? "text-neon-crimson" : ""}`}>{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      {trailing}
    </button>
  );
}

function RowExternal({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition"
    >
      <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
        <ExternalLink size={15} />
      </div>
      <div className="flex-1 text-sm">{label}</div>
      <ChevronRight size={16} className="text-muted-foreground" />
    </a>
  );
}

function RowExternalLink({
  icon,
  href,
  label,
  hint,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
  hint?: string;
}) {
  const isMail = href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={isMail ? undefined : "_blank"}
      rel={isMail ? undefined : "noreferrer"}
      className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition active:bg-foreground/10"
    >
      <div className="h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground truncate">{hint}</div>}
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </a>
  );
}

function Toggle({ on, busy }: { on: boolean; busy?: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 rounded-full transition shrink-0 ${on ? "bg-neon-green" : "bg-foreground/15"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${on ? "left-[22px]" : "left-0.5"} ${busy ? "opacity-60" : ""}`}
      />
    </span>
  );
}
