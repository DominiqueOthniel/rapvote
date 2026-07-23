export default function Loading() {
  return (
    <main className="shell section" aria-busy="true" aria-live="polite">
      <p className="muted">Chargement des candidats...</p>
      <div className="page-loading-skel" />
    </main>
  );
}
