"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FanLoginForm } from "@/components/FanLoginForm";
import { HeartLikeButton } from "@/components/HeartLikeButton";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  likedByArtist: boolean;
  fan: { id: string; name: string };
};

type Props = {
  trackId: string;
  comments: Comment[];
  fan: { id: string; name: string } | null;
  isOwner?: boolean;
};

export function TrackComments({
  trackId,
  comments,
  fan,
  isOwner,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tracks/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'envoyer le commentaire");
        setLoading(false);
        return;
      }
      setBody("");
      setLoading(false);
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessaie.");
      setLoading(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/fan-logout", { method: "POST" });
    router.refresh();
  }

  async function deleteComment(commentId: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    setBusyId(commentId);
    setActionError(null);
    try {
      const res = await fetch("/api/tracks/comment/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Suppression impossible");
        setBusyId(null);
        return;
      }
      setBusyId(null);
      router.refresh();
    } catch {
      setActionError("Connexion impossible. Réessaie.");
      setBusyId(null);
    }
  }

  async function toggleLike(commentId: string) {
    setBusyId(commentId);
    setActionError(null);
    try {
      const res = await fetch("/api/tracks/comment/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Like impossible");
        setBusyId(null);
        return;
      }
      setBusyId(null);
      router.refresh();
    } catch {
      setActionError("Connexion impossible. Réessaie.");
      setBusyId(null);
    }
  }

  return (
    <div className="track-comments">
      <h4>Commentaires ({comments.length})</h4>

      {actionError ? <p className="error">{actionError}</p> : null}

      {comments.length === 0 ? (
        <p className="muted">Aucun commentaire pour l&apos;instant.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => {
            const isAuthor = fan?.id === comment.fan.id;
            const canDelete = Boolean(isOwner || isAuthor);

            return (
              <li key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <strong>{comment.fan.name}</strong>
                  <span className="muted comment-date">
                    {new Date(comment.createdAt).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {comment.likedByArtist ? (
                    <span className="comment-liked">Aimé par l&apos;artiste</span>
                  ) : null}
                </div>
                <p>{comment.body}</p>
                {isOwner || canDelete ? (
                  <div className="comment-actions">
                    {isOwner ? (
                      <HeartLikeButton
                        liked={comment.likedByArtist}
                        busy={busyId === comment.id}
                        onToggle={() => toggleLike(comment.id)}
                        labelLiked="Retirer le like artiste"
                        labelIdle="Liker ce commentaire"
                      />
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className="btn-ghost comment-delete"
                        disabled={busyId === comment.id}
                        onClick={() => deleteComment(comment.id)}
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {fan ? (
        <form className="comment-form" onSubmit={postComment}>
          <p className="muted">
            Connecté comme <strong>{fan.name}</strong>
            {" · "}
            <button
              type="button"
              className="linkish"
              onClick={logout}
              disabled={loggingOut}
            >
              Déconnexion
            </button>
          </p>
          <label className="field">
            <span>Ton commentaire</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              minLength={2}
              maxLength={500}
              required
              placeholder="Dis un mot sur ce son..."
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Envoi..." : "Commenter"}
          </button>
        </form>
      ) : (
        <FanLoginForm />
      )}
    </div>
  );
}
