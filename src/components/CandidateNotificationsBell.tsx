"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

function typeLabel(type: string) {
  if (type === "like") return "Like";
  if (type === "comment") return "Commentaire";
  if (type === "download") return "Téléchargement";
  return "Activité";
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function CandidateNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/candidat/notifications", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0,
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    try {
      const res = await fetch("/api/candidat/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0,
      );
      setItems((prev) =>
        prev.map((n) =>
          n.readAt ? n : { ...n, readAt: new Date().toISOString() },
        ),
      );
    } catch {
      // ignore
    }
  }

  async function markOneRead(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.readAt
          ? { ...n, readAt: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((n) => Math.max(0, n - 1));
    try {
      await fetch("/api/candidat/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // ignore
    }
  }

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className="btn-ghost notif-bell-btn"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} non lues`
            : "Notifications"
        }
        onClick={() => setOpen((v) => !v)}
      >
        <span className="notif-bell-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M12 3a5.5 5.5 0 0 0-5.5 5.5v2.2c0 .7-.2 1.4-.6 2L4.6 15a1 1 0 0 0 .8 1.6h13.2a1 1 0 0 0 .8-1.6l-1.3-2.3c-.4-.6-.6-1.3-.6-2V8.5A5.5 5.5 0 0 0 12 3Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 18.2a2.6 2.6 0 0 0 5 0"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>Notifs</span>
        {unreadCount > 0 ? (
          <span className="notif-bell-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="btn-ghost notif-mark-all"
                onClick={() => void markAllRead()}
              >
                Tout lire
              </button>
            ) : null}
          </div>

          <div className="notif-panel-list">
            {loading ? (
              <p className="muted notif-empty">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="muted notif-empty">
                Aucune notification pour l&apos;instant.
              </p>
            ) : (
              items.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item${n.readAt ? "" : " is-unread"}`}
                  onClick={() => void markOneRead(n.id)}
                >
                  <span className="notif-item-type">{typeLabel(n.type)}</span>
                  <span className="notif-item-title">{n.title}</span>
                  {n.body ? (
                    <span className="notif-item-body">{n.body}</span>
                  ) : null}
                  <span className="muted notif-item-when">
                    {formatWhen(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="notif-panel-foot">
            <Link
              href="/candidat/notifications"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Voir tout
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
