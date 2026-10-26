"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface AuthUser {
  id: string;
  email?: string;
  full_name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const mapUser = useCallback((sbUser: User | null): AuthUser | null => {
    if (!sbUser) return null;
    return {
      id: sbUser.id,
      email: sbUser.email,
      full_name:
        (sbUser.user_metadata?.full_name as string) ||
        (sbUser.user_metadata?.name as string) ||
        sbUser.email?.split("@")[0] ||
        "User",
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("rc_demo_user");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (mounted) {
                setUser(parsed.user);
                setToken(parsed.token);
              }
            } catch {
              // ignore
            }
          }
        }
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(mapUser(initialSession.user));
            setToken(initialSession.access_token);
          } else if (typeof window !== "undefined") {
            const stored = localStorage.getItem("rc_demo_user");
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                setUser(parsed.user);
                setToken(parsed.token);
              } catch {
                // ignore
              }
            }
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error retrieving Supabase session:", err);
        if (mounted) setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (mounted) {
            setSession(newSession);
            if (newSession) {
              setUser(mapUser(newSession.user));
              setToken(newSession.access_token);
            } else if (typeof window !== "undefined") {
              const stored = localStorage.getItem("rc_demo_user");
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  setUser(parsed.user);
                  setToken(parsed.token);
                } catch {
                  setUser(null);
                  setToken(null);
                }
              } else {
                setUser(null);
                setToken(null);
              }
            } else {
              setUser(null);
              setToken(null);
            }
            setIsLoading(false);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [mapUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!isSupabaseConfigured) {
        const demoId = "demo-usr-" + Math.abs(email.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)).toString(16);
        const demoUser: AuthUser = {
          id: demoId,
          email,
          full_name: email.split("@")[0],
        };
        const demoToken = `mock-token-${demoId}`;
        setUser(demoUser);
        setToken(demoToken);
        if (typeof window !== "undefined") {
          localStorage.setItem("rc_demo_user", JSON.stringify({ user: demoUser, token: demoToken }));
        }
        return {};
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to sign in";
        return { error: msg };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<{ error?: string; message?: string }> => {
      if (!isSupabaseConfigured) {
        return signIn(email, password);
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
            },
          },
        });
        if (error) return { error: error.message };
        if (data.session) {
          return {};
        }
        return {
          message: "Registration successful! Please check your email to confirm your account.",
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to sign up";
        return { error: msg };
      }
    },
    [signIn]
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setToken(null);
      setSession(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("rc_demo_user");
      }
      return;
    }

    try {
      await supabase.auth.signOut();
      setUser(null);
      setToken(null);
      setSession(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error?: string; message?: string }> => {
      if (!isSupabaseConfigured) {
        return { message: "Password reset simulated in local development mode." };
      }

      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback`,
        });
        if (error) return { error: error.message };
        return { message: "Password reset link sent to your email." };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to request password reset";
        return { error: msg };
      }
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      user,
      session,
      token,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, session, token, isLoading, signIn, signUp, signOut, resetPassword]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
