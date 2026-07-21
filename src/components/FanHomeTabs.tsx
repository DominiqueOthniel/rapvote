"use client";

import { useEffect, useState } from "react";
import { FanStreakCard, type FanEngagementState } from "@/components/FanStreakCard";
import { FanLibraryView } from "@/components/FanLibraryPanel";
import { SonsFeed, type SonsFeedItem, type SonsPhaseOption } from "@/components/SonsFeed";

type HomeTab = "sons" | "library";

type Props = {
  tracks: SonsFeedItem[];
  phases: SonsPhaseOption[];
  activePhaseId: string | null;
  engagement: FanEngagementState | null;
};

export function FanHomeTabs({
  tracks,
  phases,
  activePhaseId,
  engagement,
}: Props) {
  const [tab, setTab] = useState<HomeTab>("sons");

  useEffect(() => {
    function openLibrary() {
      setTab("library");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("ftc:open-library", openLibrary);
    return () => window.removeEventListener("ftc:open-library", openLibrary);
  }, []);

  return (
    <>
      <div className="fan-home-tabs" role="tablist" aria-label="Navigation sons">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sons"}
          className={`fan-home-tab${tab === "sons" ? " is-active" : ""}`}
          onClick={() => setTab("sons")}
        >
          Sons
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "library"}
          className={`fan-home-tab${tab === "library" ? " is-active" : ""}`}
          onClick={() => setTab("library")}
        >
          Ma bibliothèque
        </button>
      </div>

      {tab === "sons" ? (
        <>
          {engagement ? <FanStreakCard initial={engagement} /> : null}
          <SonsFeed
            tracks={tracks}
            phases={phases}
            fanLoggedIn
            activePhaseId={activePhaseId}
          />
        </>
      ) : (
        <section className="fan-lib-home">
          <div className="fan-lib-home-intro">
            <h2 className="page-title" style={{ fontSize: "1.6rem" }}>
              Ma bibliothèque
            </h2>
            <p className="muted">
              Sons sauvegardés et historique d&apos;écoutes.
            </p>
          </div>
          <FanLibraryView showHeader={false} />
        </section>
      )}
    </>
  );
}
