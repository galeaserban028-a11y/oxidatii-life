import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { warmAuthStorage } from "@/integrations/supabase/auth-storage";

type Profile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  city_id: string | null;
  avatar_url: string | null;
  rank: string;
  aura: number;
  lifetime_sprits: number;
  onboarded: boolean;
  location_consent: boolean;
  is_public: boolean;
  coin_balance: number;
  active_frame_id: string | null;
  premium_tier?: string | null;
  premium_until?: string | null;
  boost_until?: string | null;
  last_boost_at?: string | null;
  profile_theme_id?: string | null;
  music_clip_url?: string | null;
  profile_bg_url?: string | null;
  theme_intensity?: {
    gradient?: number;
    aurora?: number;
    sheen?: number;
    grain?: number;
    vignette?: number;
  } | null;
  bio?: string | null;
  current_streak?: number | null;
  longest_streak?: number | null;
  last_streak_week?: string | null;
  created_at?: string | null;
};

type Ctx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** true while we either don't know the session yet OR we have a user but haven't finished loading their profile */
  loading: boolean;
  /** true only during the very first session bootstrap */
  initializing: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const mountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (uid: string) => {
    if (mountedRef.current) setProfileLoading(true);
    try {
      // Select only columns readable for cross-user via RLS. Sensitive private
      // fields (coin_balance, last_boost_at, map_*, location_consent) are
      // fetched separately via the get_my_account_state() RPC for self.
      const fetchBundle = () => {
        const profileRequest = supabase
          .from("profiles")
          .select(
            "id, handle, display_name, city_id, avatar_url, rank, aura, lifetime_sprits, current_streak, longest_streak, is_public, active_frame_id, profile_theme_id, music_clip_url, profile_bg_url, theme_intensity, bio",
          )
          .eq("id", uid)
          .maybeSingle();

        const stateRequest = supabase.rpc("get_my_account_state");
        // 4s is plenty for a healthy round-trip; anything above that means the
        // network is stalled and we should refresh the session and retry once.
        const timeout = new Promise<null>((resolve) =>
          window.setTimeout(() => resolve(null), 4000),
        );
        return Promise.race([Promise.all([profileRequest, stateRequest]), timeout]);
      };

      let result = await fetchBundle();
      if (result === null) {
        await supabase.auth.refreshSession().catch(() => null);
        result = await fetchBundle();
      }

      if (!mountedRef.current) return;
      if (result === null) {
        console.warn("Profile load timed out");
        return;
      }
      const [profileRes, stateRes] = result as [
        { data: unknown; error: { message?: string } | null },
        { data: unknown; error: { message?: string } | null },
      ];
      if (profileRes.error) {
        console.error("Could not load profile", profileRes.error);
        setProfile(null);
        return;
      }
      if (stateRes.error) {
        console.error("Could not load private account state", stateRes.error);
        setProfile(null);
        return;
      }
      const baseProfile = profileRes.data as Record<string, unknown> | null;
      const stateRows = (stateRes.data ?? []) as Array<Record<string, unknown>>;
      const stateRow = stateRows[0] ?? null;
      if (baseProfile && !stateRow) {
        console.warn("Private account state returned no row");
        setProfile(null);
        return;
      }
      setProfile(baseProfile ? ({ ...baseProfile, ...stateRow } as Profile) : null);
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Until bootstrap finishes, ignore null INITIAL_SESSION — Preferences may
    // still be hydrating and a premature null would bounce the user to /login.
    const bootDoneRef = { current: false };

    const applySession = (sess: Session | null, event?: string) => {
      if (!bootDoneRef.current && !sess?.user && event !== "SIGNED_OUT") {
        return;
      }
      setSession(sess);
      setUser(sess?.user ?? null);

      const newUid = sess?.user?.id ?? null;
      const prevUid = lastUserIdRef.current;
      const identityChanged = newUid !== prevUid;
      lastUserIdRef.current = newUid;

      if (sess?.user) {
        if (identityChanged) {
          setTimeout(() => {
            void loadProfile(sess.user.id);
          }, 0);
        }
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      applySession(sess, event);

      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event === "USER_UPDATED") qc.invalidateQueries();
      }
    });

    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      bootDoneRef.current = true;
      if (mountedRef.current) setInitializing(false);
    }, 8000);

    const restoreSession = async (): Promise<Session | null> => {
      await warmAuthStorage();
      let { data } = await supabase.auth.getSession();
      if (data.session) return data.session;

      // Retry with backoff — cold Android starts often miss the first read.
      for (const wait of [200, 450, 800]) {
        await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return null;
        await warmAuthStorage();
        ({ data } = await supabase.auth.getSession());
        if (data.session) return data.session;
      }

      // Last resort: force refresh from stored refresh_token.
      try {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data.session) return refreshed.data.session;
      } catch {
        /* noop */
      }
      return null;
    };

    (async () => {
      try {
        const sess = await restoreSession();
        if (cancelled) return;
        bootDoneRef.current = true;
        applySession(sess, sess ? "SIGNED_IN" : undefined);
        if (sess?.user) await loadProfile(sess.user.id);
      } catch (error) {
        console.error("Could not restore session", error);
        bootDoneRef.current = true;
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        window.clearTimeout(fallbackTimer);
        if (!cancelled && mountedRef.current) setInitializing(false);
      }
    })();

    // On resume, re-hydrate from Preferences and refresh tokens.
    let removeResume: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) return;
          void (async () => {
            await warmAuthStorage();
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              applySession(data.session);
              await supabase.auth.refreshSession().catch(() => null);
            } else {
              const again = await restoreSession();
              if (again) applySession(again, "SIGNED_IN");
            }
          })();
        });
        removeResume = () => {
          void handle.remove();
        };
      } catch {
        /* web / plugin missing */
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
      removeResume?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While we have a user, we are still "loading" until the profile fetch settles —
  // prevents redirects from firing before we know if the user is onboarded.
  const loading = initializing || (!!user && profileLoading);

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        profile,
        loading,
        initializing,
        signOut: async () => {
          await qc.cancelQueries();
          qc.clear();
          await supabase.auth.signOut();
        },
        refreshProfile: async () => {
          if (user) await loadProfile(user.id);
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
