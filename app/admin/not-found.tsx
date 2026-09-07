import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-[#e4e7ec] bg-white p-6 text-center">
      <h1 className="text-base font-semibold text-[#101828]">Record not found.</h1>
      <p className="mt-1 text-sm text-[#667085]">
        This record may have been deleted or the link is out of date.
      </p>
      <Link
        href="/admin"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-[#193be0] px-3 py-2 text-sm font-medium text-white hover:bg-[#1531bd]"
      >
        Back to overview
      </Link>
    </div>
  );
}
