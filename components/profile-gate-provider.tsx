"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PROFILE_GATE_SELECT } from "@/lib/profile-gate-paths";
import { isRequiredProfileComplete, type ProfileDbInput } from "@/lib/profile-validation";
import { getSessionWithRetry, isSupabaseConfigured, supabase } from "@/lib/supabase";

type ProfileGateContextValue = {
  loading: boolean;
  isLoggedIn: boolean;
  profileComplete: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileGateContext = createContext<ProfileGateContextValue>({
  loading: true,
  isLoggedIn: false,
  profileComplete: false,
  refreshProfile: async () => {},
});

export function ProfileGateProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      setIsLoggedIn(false);
      setProfileComplete(false);
      return;
    }

    const session = await getSessionWithRetry();
    if (!session) {
      setIsLoggedIn(false);
      setProfileComplete(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setIsLoggedIn(false);
      setProfileComplete(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_GATE_SELECT)
      .eq("user_id", userData.user.id)
      .maybeSingle<ProfileDbInput>();

    setProfileComplete(isRequiredProfileComplete(profile));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      loading,
      isLoggedIn,
      profileComplete,
      refreshProfile: loadProfile,
    }),
    [loading, isLoggedIn, profileComplete, loadProfile],
  );

  return <ProfileGateContext.Provider value={value}>{children}</ProfileGateContext.Provider>;
}

export function useProfileGate() {
  return useContext(ProfileGateContext);
}
