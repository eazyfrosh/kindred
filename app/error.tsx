'use client';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container section">
      <div className="empty">
        <h1 className="text-3xl">We couldn’t load this page.</h1>
        <p>The service may be temporarily unavailable. Please try again.</p>
        <button className="button mt-6" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
