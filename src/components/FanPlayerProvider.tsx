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
};

type FanPlayerContextValue = {
  track: FanPlayerTrack | null;
  queue: FanPlayerTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: FanPlayerTrack, queue?: FanPlayerTrack[]) => void;
  toggle: () => void;
  pause: () => void;
  seek: (time: number) => void;
  playNext: () => void;
  playPrev: () => void;
};

const FanPlayerContext = createContext<FanPlayerContextValue | null>(null);

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

async function registerPlayCount(trackId: string) {
  const key = `ftc-play-${trackId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore
  }
  try {
    await fetch("/api/tracks/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
  } catch {
    // ignore
  }
}

export function FanPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenedSeconds = useRef(0);
  const lastCurrentTime = useRef(0);
  const countedPlay = useRef(false);
  const trackIdRef = useRef<string | null>(null);

  const [track, setTrack] = useState<FanPlayerTrack | null>(null);
  const [queue, setQueue] = useState<FanPlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const resetListenStats = useCallback(() => {
    listenedSeconds.current = 0;
    lastCurrentTime.current = 0;
    countedPlay.current = false;
  }, []);

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
        () => setIsPlaying(true),
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
        () => setIsPlaying(true),
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
    setCurrentTime(audio.currentTime);
    lastCurrentTime.current = audio.currentTime;
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
      setCurrentTime(audio.currentTime);
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) setDuration(dur);

      if (!trackIdRef.current || countedPlay.current) return;
      if (!Number.isFinite(dur) || dur <= 0) return;

      const current = audio.currentTime;
      const delta = current - lastCurrentTime.current;
      if (delta > 0 && delta < 1.5) {
        listenedSeconds.current += delta;
      }
      lastCurrentTime.current = current;

      if (listenedSeconds.current >= dur * 0.5) {
        countedPlay.current = true;
        void registerPlayCount(trackIdRef.current);
      }
    }

    function onSeeked() {
      if (!audio) return;
      lastCurrentTime.current = audio.currentTime;
    }

    function onLoaded() {
      if (!audio) return;
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    }

    function onPlay() {
      setIsPlaying(true);
    }

    function onPause() {
      setIsPlaying(false);
    }

    function onEnded() {
      setIsPlaying(false);
      playNext();
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("seeked", onSeeked);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("seeked", onSeeked);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playNext]);

  const value = useMemo(
    () => ({
      track,
      queue,
      isPlaying,
      currentTime,
      duration,
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
