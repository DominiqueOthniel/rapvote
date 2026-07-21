"use client";

type Props = {
  title: string;
  phaseLabel: string;
  audioUrl: string;
  lyrics: string | null;
};

export function TrackListenCard({
  title,
  phaseLabel,
  audioUrl,
  lyrics,
}: Props) {
  const hasLyrics = Boolean(lyrics?.trim());

  return (
    <div className="track-listen">
      <header className="track-card-head">
        <p className="muted">{phaseLabel}</p>
        <h3>{title}</h3>
      </header>

      <div className={hasLyrics ? "track-listen-grid" : "track-listen-solo"}>
        <div className="track-listen-player">
          <p className="track-listen-kicker">Écoute</p>
          <audio
            controls
            preload="none"
            src={audioUrl}
            className="phase-audio-player track-listen-audio"
          >
            Lecteur audio
          </audio>
          {hasLyrics ? (
            <p className="muted track-listen-tip">
              Lance le son, puis scroll les lyrics à droite.
            </p>
          ) : (
            <p className="muted track-listen-tip">
              Pas encore de lyrics pour ce son.
            </p>
          )}
        </div>

        {hasLyrics ? (
          <div className="track-lyrics-panel">
            <div className="track-lyrics-head">
              <p className="track-listen-kicker">Lyrics</p>
            </div>
            <div className="track-lyrics-scroll" tabIndex={0}>
              <pre className="track-lyrics-text">{lyrics}</pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
