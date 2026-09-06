export default function Loading() {
  return (
    <div className="container loading-grid" role="status" aria-label="Loading">
      <div className="skeleton mb-8" style={{ minHeight: 100, width: '70%' }} />
      <div className="three-grid">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <span className="sr-only">Loading, please wait.</span>
    </div>
  );
}
