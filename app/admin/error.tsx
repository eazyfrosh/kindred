'use client';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The message itself is never rendered — server details stay on the server.
    console.error('Admin page error', error.digest || 'no digest');
  }, [error]);
  return (
    <div className="mx-auto max-w-md rounded-lg border border-[#fecdca] bg-[#fef3f2] p-6 text-center">
      <h1 className="text-base font-semibold text-[#912018]">This page could not be loaded.</h1>
      <p className="mt-1 text-sm text-[#b42318]">
        The record may have changed, or a required Firestore index is still building. Try again in a
        moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#d0d5dd] bg-white px-3 py-2 text-sm font-medium text-[#344054] hover:bg-[#f9fafb]"
      >
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  );
}
