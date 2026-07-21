"use client";

import { useCallback, useEffect, useState } from "react";
import { FanLoginForm } from "@/components/FanLoginForm";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  likedByArtist: boolean;
  fan: { id: string; name: string };
};

type Props = {
  trackId: string;
};

export function FanPlayerComments({ trackId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [fan, setFan] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tracks/comment?trackId=${encodeURIComponent(trackId)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Impossible de charger les commentaires");
        setLoading(false);
        return;
      }
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setFan(data.fan ?? null);
    } catch {
      setError("Connexion impossible. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fan) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/tracks/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Envoi impossible");
        setPosting(false);
        return;
      }
      setBody("");
      setPosting(false);
      await load();
    } catch {
      setError("Connexion impossible. Réessaie.");
      setPosting(false);
    }
  }

  return (
    <div className="fan-player-comments">
      <div className="fan-player-comments-list">
        {loading ? (
          <p className="muted">Chargement…</p>
        ) : comments.length === 0 ? (
          <p className="muted">Aucun commentaire pour l&apos;instant.</p>
        ) : (
          <ul className="fan-player-comment-ul">
            {comments.map((c) => (
              <li key={c.id} className="fan-player-comment-item">
                <div className="fan-player-comment-meta">
                  <strong>{c.fan.name}</strong>
                  <span className="muted">
                    {new Date(c.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {c.likedByArtist ? (
                    <span className="comment-liked">Aimé par l&apos;artiste</span>
                  ) : null}
                </div>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="error">{error}</p> : null}

      {fan ? (
        <form className="fan-player-comment-form" onSubmit={onSubmit}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={500}
            required
            minLength={2}
            placeholder={`Commenter en tant que ${fan.name}`}
          />
          <button className="btn-primary" type="submit" disabled={posting}>
            {posting ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      ) : (
        <div className="fan-player-comment-login">
          <FanLoginForm onLoggedIn={() => void load()} />
        </div>
      )}
    </div>
  );
}
