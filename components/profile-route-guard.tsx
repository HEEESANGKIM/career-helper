"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfileGate } from "@/components/profile-gate-provider";
import { isProfileGatedPath, PROFILE_GATE_SETTINGS_PATH } from "@/lib/profile-gate-paths";

export function ProfileRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isLoggedIn, profileComplete } = useProfileGate();

  useEffect(() => {
    if (loading || !isLoggedIn || profileComplete) return;
    if (isProfileGatedPath(pathname)) {
      router.replace(PROFILE_GATE_SETTINGS_PATH);
    }
  }, [loading, isLoggedIn, profileComplete, pathname, router]);

  return null;
}
