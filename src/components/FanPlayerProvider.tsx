"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type FanPlayerTrack = {
  id: string;
  title: string;
  audioUrl: string;
  candidateSlug: string;
  candidateName: string;
  candidatePhotoUrl: string | null;
  likeCount: number;
  likedByFan: boolean;
  lyrics?: string | null;
};

type FanPlayerContextValue = {
  track: FanPlayerTrack | null;
  queue: FanPlayerTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playCounts: Record<string, number>;
  playTrack: (track: FanPlayerTrack, queue?: FanPlayerTrack[]) => void;
  toggle: () => void;
  pause: () => void;
  seek: (time: number) => void;
  playNext: () => void;
  playPrev: () => void;
};

const FanPlayerContext = createContext<FanPlayerContextValue | null>(null);

/** Compte une écoute après 30s réelles, ou 45% du son (le plus bas des deux). */
function listenThreshold(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 30;
  return Math.min(30, Math.max(12, duration * 0.45));
}

export function useFanPlayer() {
  const ctx = useContext(FanPlayerContext);
  if (!ctx) {
    throw new Error("useFanPlayer must be used within FanPlayerProvider");
  }
  return ctx;
}

export function useFanPlayerOptional() {
  return useContext(FanPlayerContext);
}

async function postPlayCount(trackId: string): Promise<{
  playCount: number;
      engagement?: {
        streakCount: number;
        freeVotes: number;
        streakBadgeEarned: boolean;
        streamsToReward: number;
        rewardedNow?: boolean;
      } | null;
} | null> {
  const key = `ftc-play-${trackId}`;
  try {
    if (sessionStorage.getItem(key)) return null;
  } catch {
    // ignore
  }

  try {
    const res = await fetch("/api/tracks/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    if (data?.engagement) {
      window.dispatchEvent(
        new CustomEvent("ftc:fan-engagement", { detail: data.engagement }),
      );
    }
    window.dispatchEvent(new Event("ftc:buzz-refresh"));
    return {
      playCount:
        typeof data?.playCount === "number" ? data.playCount : 0,
      engagement: data?.engagement ?? null,
    };
  } catch {
    return null;
  }
}

export function FanPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenedSeconds = useRef(0);
  const lastCurrentTime = useRef(0);
  const countedPlay = useRef(false);
  const countingInFlight = useRef(false);
  const trackIdRef = useRef<string | null>(null);

  const [track, setTrack] = useState<FanPlayerTrack | null>(null);
  const [queue, setQueue] = useState<FanPlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  const resetListenStats = useCallback(() => {
    listenedSeconds.current = 0;
    lastCurrentTime.current = 0;
    countedPlay.current = false;
    countingInFlight.current = false;
  }, []);

  const tryCountPlay = useCallback(async () => {
    const trackId = trackIdRef.current;
    const audio = audioRef.current;
    if (!trackId || countedPlay.current || countingInFlight.current) return;

    const dur = audio?.duration ?? 0;
    const threshold = listenThreshold(dur);
    // Fin naturelle: compter si l'écoute réelle couvre l'essentiel du son
    // (évite un comptage après un seek jusqu'à la fin).
    const mostlyFinished =
      Number.isFinite(dur) &&
      dur > 0 &&
      listenedSeconds.current >= Math.min(dur * 0.85, Math.max(threshold, dur - 1));

    if (listenedSeconds.current < threshold && !mostlyFinished) return;

    countedPlay.current = true;
    countingInFlight.current = true;
    const result = await postPlayCount(trackId);
    countingInFlight.current = false;
    if (result && typeof result.playCount === "number") {
      setPlayCounts((prev) => ({ ...prev, [trackId]: result.playCount }));
    } else {
      // Échec API: on réessaie. Déjà compté en session: on laisse counted.
      try {
        if (!sessionStorage.getItem(`ftc-play-${trackId}`)) {
          countedPlay.current = false;
        }
      } catch {
        countedPlay.current = false;
      }
    }
  }, []);

  const accumulateListen = useCallback(
    (audio: HTMLAudioElement) => {
      const current = audio.currentTime;
      const delta = current - lastCurrentTime.current;
      // Ignore les gros sauts (seek lyrics / scrub).
      if (delta > 0 && delta < 1.25) {
        listenedSeconds.current += delta;
      }
      lastCurrentTime.current = current;

      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) setDuration(dur);
      setCurrentTime(current);
      void tryCountPlay();
    },
    [tryCountPlay],
  );

  const playTrack = useCallback(
    (next: FanPlayerTrack, nextQueue?: FanPlayerTrack[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (nextQueue) setQueue(nextQueue);
      if (trackIdRef.current !== next.id) {
        trackIdRef.current = next.id;
        resetListenStats();
        setTrack(next);
        setCurrentTime(0);
        setDuration(0);
        audio.src = next.audioUrl;
        audio.load();
      } else {
        setTrack(next);
      }

      void audio.play().then(
        () => {
          lastCurrentTime.current = audio.currentTime;
          setIsPlaying(true);
        },
        () => setIsPlaying(false),
      );
    },
    [resetListenStats],
  );

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) {
      void audio.play().then(
        () => {
          lastCurrentTime.current = audio.currentTime;
          setIsPlaying(true);
        },
        () => setIsPlaying(false),
      );
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [track]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = Math.max(0, time);
    lastCurrentTime.current = audio.currentTime;
    setCurrentTime(audio.currentTime);
  }, []);

  const playNext = useCallback(() => {
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === track.id);
    const next = queue[(idx + 1) % queue.length];
    if (next) playTrack(next);
  }, [track, queue, playTrack]);

  const playPrev = useCallback(() => {
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === track.id);
    const prev = queue[(idx - 1 + queue.length) % queue.length];
    if (prev) playTrack(prev);
  }, [track, queue, playTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      if (!audio) return;
      accumulateListen(audio);
    }

    function onSeeked() {
      if (!audio) return;
      lastCurrentTime.current = audio.currentTime;
    }

    function onLoaded() {
      if (!audio) return;
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
      lastCurrentTime.current = audio.currentTime;
    }

    function onPlay() {
      if (!audio) return;
      lastCurrentTime.current = audio.currentTime;
      setIsPlaying(true);
    }

    function onPause() {
      setIsPlaying(false);
    }

    function onEnded() {
      setIsPlaying(false);
      void tryCountPlay().finally(() => {
        playNext();
      });
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("seeked", onSeeked);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("seeked", onSeeked);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [accumulateListen, playNext, tryCountPlay]);

  // Horloge fluide + accumulation fiable (timeupdate est irrégulier sur mobile).
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        accumulateListen(audio);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, accumulateListen]);

  const value = useMemo(
    () => ({
      track,
      queue,
      isPlaying,
      currentTime,
      duration,
      playCounts,
      playTrack,
      toggle,
      pause,
      seek,
      playNext,
      playPrev,
    }),
    [
      track,
      queue,
      isPlaying,
      currentTime,
      duration,
      playCounts,
      playTrack,
      toggle,
      pause,
      seek,
      playNext,
      playPrev,
    ],
  );

  return (
    <FanPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" className="fan-player-audio" />
    </FanPlayerContext.Provider>
  );
}
