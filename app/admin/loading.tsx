import { LoadingTable } from '@/components/admin/ui';

export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-56 animate-pulse rounded bg-[#e4e7ec]" />
      <LoadingTable />
    </div>
  );
}
