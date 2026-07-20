"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FanLoginForm } from "@/components/FanLoginForm";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  fan: { name: string };
};

type Props = {
  trackId: string;
  comments: Comment[];
  fan: { id: string; name: string } | null;
  isAdmin?: boolean;
  slug?: string;
  deleteCommentAction?: (formData: FormData) => Promise<void>;
};

export function TrackComments({
  trackId,
  comments,
  fan,
  isAdmin,
  slug,
  deleteCommentAction,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <div className="track-comments">
      <h4>Commentaires ({comments.length})</h4>

      {comments.length === 0 ? (
        <p className="muted">Aucun commentaire pour l&apos;instant.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment-item">
              <div className="comment-meta">
                <strong>{comment.fan.name}</strong>
                <span className="muted comment-date">
                  {new Date(comment.createdAt).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p>{comment.body}</p>
              {isAdmin && deleteCommentAction && slug ? (
                <form action={deleteCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="btn-ghost comment-delete">
                    Supprimer
                  </button>
                </form>
              ) : null}
            </li>
          ))}
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
