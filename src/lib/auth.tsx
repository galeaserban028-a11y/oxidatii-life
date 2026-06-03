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
};

type Ctx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (uid: string) => {
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
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const finishLoading = () => {
      if (mountedRef.current) setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
      router.invalidate();
      qc.invalidateQueries();
    });
    let cancelled = false;
    const fallbackTimer = window.setTimeout(finishLoading, 3500);
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
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
        if (!cancelled) finishLoading();
      });
    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.clearTimeout(fallbackTimer);
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signOut: async () => {
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
