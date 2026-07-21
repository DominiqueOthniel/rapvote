"use client";

import { useCallback, useEffect, useState } from "react";

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
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function CandidateNotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/candidat/notifications", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Impossible de charger les notifications");
        setLoading(false);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0,
      );
    } catch {
      setError("Connexion impossible. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    try {
      const res = await fetch("/api/candidat/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) return;
      setUnreadCount(0);
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
    const target = items.find((n) => n.id === id);
    if (!target || target.readAt) return;
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
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
    <section className="admin-card notif-page">
      <div className="notif-page-head">
        <div>
          <h1>Notifications</h1>
          {unreadCount > 0 ? (
            <p className="muted">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void markAllRead()}
          >
            Tout marquer comme lu
          </button>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="muted">
          Aucune notification pour l&apos;instant.
        </p>
      ) : (
        <ul className="notif-page-list">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`notif-page-item${n.readAt ? "" : " is-unread"}`}
                onClick={() => void markOneRead(n.id)}
              >
                <span className="notif-item-type">{typeLabel(n.type)}</span>
                <strong className="notif-item-title">{n.title}</strong>
                {n.body ? (
                  <span className="notif-item-body">{n.body}</span>
                ) : null}
                <span className="muted notif-item-when">
                  {formatWhen(n.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
