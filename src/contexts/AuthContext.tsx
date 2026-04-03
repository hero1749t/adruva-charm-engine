import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfileExists } from "@/lib/profile";
import { setSentryUser } from "@/lib/sentry";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeAuthError = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    if (error.message.includes("rate_limit")) {
      return new Error("Too many attempts. Please wait 15-30 minutes before trying again.");
    }
    if (error.message.includes("Invalid login credentials")) {
      return new Error("Invalid email or password. Please check and try again.");
    }
    return error;
  }

  return new Error(fallback);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const claimedInviteUserIds = useRef<Set<string>>(new Set());

  const claimPendingInvites = useCallback(async (nextUser: User | null) => {
    if (!nextUser?.email || claimedInviteUserIds.current.has(nextUser.id)) {
      return;
    }

    const { data: invitations, error } = await supabase
      .from("staff_invitations")
      .select("id")
      .eq("status", "pending")
      .eq("email", nextUser.email);

    if (error || !invitations?.length) {
      claimedInviteUserIds.current.add(nextUser.id);
      return;
    }

    for (const invitation of invitations) {
      await supabase.rpc("claim_staff_invitation", { _invitation_id: invitation.id });
    }

    claimedInviteUserIds.current.add(nextUser.id);
  }, []);

  const hydrateUserData = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      return;
    }

    await Promise.allSettled([
      ensureProfileExists(nextUser),
      claimPendingInvites(nextUser),
    ]);
  }, [claimPendingInvites]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setSentryUser(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email } : null);
      void hydrateUserData(nextSession?.user ?? null);
      setLoading(false);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: nextSession } }) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setSentryUser(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email } : null);
        return hydrateUserData(nextSession?.user ?? null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [hydrateUserData]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });

      return { error: error ? normalizeAuthError(error, "Signup failed.") : null };
    } catch (err) {
      return { error: normalizeAuthError(err, "Signup failed.") };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: normalizeAuthError(error, "Login failed."), user: null };
      }

      setSession(data.session);
      setUser(data.user);
      setSentryUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      await hydrateUserData(data.user);

      return { error: null, user: data.user };
    } catch (err) {
      return { error: normalizeAuthError(err, "Login failed."), user: null };
    }
  }, [hydrateUserData]);

  const signOut = useCallback(async () => {
    if (user) {
      claimedInviteUserIds.current.delete(user.id);
    }
    setSentryUser(null);
    await supabase.auth.signOut();
  }, [user]);

  const value = useMemo(
    () => ({ user, session, loading, signUp, signIn, signOut }),
    [user, session, loading, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
