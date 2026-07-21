"use client";

import { usePathname } from "next/navigation";
import { FanNowPlayingBar } from "@/components/FanNowPlayingBar";
import { FanPlayerProvider } from "@/components/FanPlayerProvider";

export function FanPlayerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/jury") ||
    pathname === "/candidat" ||
    pathname.startsWith("/candidat/");

  if (hidden) {
    return <>{children}</>;
  }

  return (
    <FanPlayerProvider>
      <div className="fan-player-shell">{children}</div>
      <FanNowPlayingBar />
    </FanPlayerProvider>
  );
}
