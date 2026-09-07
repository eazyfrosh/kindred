import { requireAdmin } from '@/lib/admin/auth';
import { exportSubscribers } from '@/lib/admin/submissions';
import { recordAudit } from '@/lib/admin/audit';
import { apiError } from '@/lib/api';

const escape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Newsletter subscriber export. Admin-only, and the export itself is audited. */
export async function GET() {
  try {
    const actor = await requireAdmin();
    const rows = await exportSubscribers();
    await recordAudit(actor, {
      action: 'newsletter.export',
      targetType: 'subscriber',
      targetId: 'all',
      description: `Exported ${rows.length} newsletter subscribers`,
      metadata: { count: rows.length },
    });
    const csv = [
      'email,status,consent,signed_up_at',
      ...rows.map((row) =>
        [row.email, row.status || 'subscribed', row.consent ? 'yes' : 'no', row.createdAt]
          .map((value) => escape(String(value ?? '')))
          .join(','),
      ),
    ].join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
