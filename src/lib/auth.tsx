import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  async function loadProfile(uid: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
  }

  useEffect(() => {
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
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
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
