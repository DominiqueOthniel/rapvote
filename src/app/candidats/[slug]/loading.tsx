export default function Loading() {
  return (
    <main className="shell candidate-hero" aria-busy="true" aria-live="polite">
      <p className="muted">Chargement de l&apos;artiste...</p>
      <div className="page-loading-skel" />
    </main>
  );
}
