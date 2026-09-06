'use client';
import { useRouter } from 'next/navigation';
export function ReceiptActions({ pending = false }: { pending?: boolean }) {
  const router = useRouter();
  return (
    <div className="button-row no-print">
      <button className="button" onClick={() => (pending ? router.refresh() : window.print())}>
        {pending ? 'Check payment status' : 'Print / save receipt'}
      </button>
    </div>
  );
}
