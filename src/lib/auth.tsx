import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  theme_intensity?: { gradient?: number; aurora?: number; sheen?: number; grain?: number; vignette?: number } | null;
  bio?: string | null;
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
      const profileRequest = supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5000));
      const result = await Promise.race([profileRequest, timeout]);

      if (!mountedRef.current) return;
      if (result === null) {
        console.warn("Profile load timed out");
        setProfile(null);
        return;
      }
      const { data, error } = result;
      if (error) {
        console.error("Could not load profile", error);
        setProfile(null);
        return;
      }
      setProfile(data as Profile | null);
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Single listener. Filter to identity transitions only — avoids
    // refetch/router-invalidation storms on TOKEN_REFRESHED/INITIAL_SESSION.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      const newUid = sess?.user?.id ?? null;
      const prevUid = lastUserIdRef.current;
      const identityChanged = newUid !== prevUid;
      lastUserIdRef.current = newUid;

      if (sess?.user) {
        if (identityChanged) {
          // defer to escape the auth callback
          setTimeout(() => { void loadProfile(sess.user.id); }, 0);
        }
      } else {
        setProfile(null);
        setProfileLoading(false);
      }

      // Only act on real identity transitions, not silent token refreshes.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        // Never refetch right after SIGNED_OUT: the cleared session would 401 every protected query.
        if (event !== "SIGNED_OUT") qc.invalidateQueries();
      }
    });

    // Bootstrap the session once.
    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (mountedRef.current) setInitializing(false);
    }, 3500);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        lastUserIdRef.current = data.session?.user?.id ?? null;
        if (data.session?.user) await loadProfile(data.session.user.id);
      })
      .catch((error) => {
        console.error("Could not restore session", error);
        setSession(null);
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        window.clearTimeout(fallbackTimer);
        if (!cancelled && mountedRef.current) setInitializing(false);
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
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
