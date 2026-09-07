import Link from 'next/link';
import { notFound } from 'next/navigation';
import { money } from '@/lib/brand';
import { getDonationDetail } from '@/lib/admin/donations';
import { auditHistoryFor } from '@/lib/admin/audit';
import { adjustDonationAction } from '@/lib/admin/actions/donations';
import { AdminPageHeader, DateCell, EmptyState, Panel, StatusBadge } from '@/components/admin/ui';
import { ActionButton } from '@/components/admin/action-form';
import { LABEL, LINK } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Donation' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e4e7ec] px-4 py-2.5 last:border-0">
      <dt className={LABEL}>{label}</dt>
      <dd className="text-sm text-[#101828]">{children}</dd>
    </div>
  );
}

export default async function AdminDonationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const { id } = await params;
  const [detail, history] = await Promise.all([
    getDonationDetail(id),
    auditHistoryFor('donation', id),
  ]);
  if (!detail) notFound();
  const { donation, campaign, donor } = detail;

  return (
    <>
      <AdminPageHeader
        title={money(donation.amount, donation.currency)}
        description={`Transaction ${donation.id}`}
      >
        <StatusBadge status={donation.paymentStatus} />
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel title="Transaction">
            <dl>
              <Row label="Amount">{money(donation.amount, donation.currency)}</Row>
              <Row label="Currency">{donation.currency}</Row>
              <Row label="Frequency">{donation.frequency}</Row>
              <Row label="Provider">{donation.paymentProvider}</Row>
              <Row label="Provider reference">
                <span className="font-mono text-xs">{donation.providerTransactionId || '—'}</span>
              </Row>
              <Row label="Internal reference">
                <span className="font-mono text-xs">
                  {donation.paymentReference || donation.id}
                </span>
              </Row>
              <Row label="Webhook confirmation">
                {donation.confirmedAt ? (
                  <span className="text-[#067647]">
                    Confirmed <DateCell value={donation.confirmedAt} />
                  </span>
                ) : (
                  <span className="text-[#b54708]">Not confirmed by a webhook</span>
                )}
              </Row>
              <Row label="Created">
                <DateCell value={donation.createdAt} />
              </Row>
              <Row label="Refunded">
                {donation.refundedMinor
                  ? money(donation.refundedMinor / 100, donation.currency)
                  : '—'}
              </Row>
              {donation.adjustmentReason && (
                <Row label="Manual adjustment">{donation.adjustmentReason}</Row>
              )}
            </dl>
          </Panel>

          <Panel title="Donor">
            <dl>
              <Row label="Name">
                {donation.anonymous ? 'Anonymous supporter' : donation.donorName}
              </Row>
              <Row label="Email">{donation.donorEmail}</Row>
              <Row label="Account">
                {donor ? (
                  <Link href={`/admin/users/${donation.donorId}`} className={LINK}>
                    View profile
                  </Link>
                ) : (
                  'Guest donation'
                )}
              </Row>
              <Row label="Public message">{donation.message || '—'}</Row>
            </dl>
          </Panel>

          <Panel title="Campaign">
            {campaign ? (
              <dl>
                <Row label="Title">
                  <Link href={`/admin/campaigns/${donation.campaignId}`} className={LINK}>
                    {donation.campaignTitle}
                  </Link>
                </Row>
                <Row label="Category">{campaign.category}</Row>
                <Row label="Status">
                  <StatusBadge status={campaign.status} />
                </Row>
              </dl>
            ) : (
              <EmptyState title="The campaign record no longer exists." />
            )}
          </Panel>

          <Panel title="Audit history">
            {history.length === 0 ? (
              <EmptyState title="No manual adjustments recorded." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {history.map((entry) => (
                  <li key={entry.id} className="px-4 py-2.5">
                    <p className="text-sm text-[#101828]">{entry.description}</p>
                    <p className="text-xs text-[#667085]">
                      {entry.adminEmail} · {new Date(entry.createdAt).toLocaleString('en-GB')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel
            title="Manual adjustment"
            description="Reserved for states a provider reported outside the webhook."
          >
            <div className="space-y-3 p-4">
              <p className="rounded-md border border-[#fedf89] bg-[#fffaeb] px-3 py-2 text-xs leading-5 text-[#b54708]">
                A payment can never be marked successful from here. Confirmed donations come only
                from signature-verified provider webhooks. Every adjustment below is recorded in the
                audit log with your account and reason.
              </p>
              {donation.paymentStatus === 'pending' && (
                <ActionButton
                  action={adjustDonationAction}
                  fields={{ id: donation.id, status: 'failed' }}
                  label="Mark intent failed"
                  variant="danger"
                  confirm={{
                    title: 'Mark this intent failed?',
                    description: 'Use this only for an abandoned or provider-rejected attempt.',
                    reasonLabel: 'Reason',
                  }}
                />
              )}
              {donation.paymentStatus === 'successful' && (
                <>
                  <ActionButton
                    action={adjustDonationAction}
                    fields={{ id: donation.id, status: 'refunded' }}
                    label="Record refund"
                    variant="danger"
                    confirm={{
                      title: 'Record this donation as refunded?',
                      description: 'Issue the refund with the payment provider first.',
                      reasonLabel: 'Refund reason and provider reference',
                    }}
                  />
                  <ActionButton
                    action={adjustDonationAction}
                    fields={{ id: donation.id, status: 'disputed' }}
                    label="Record dispute"
                    variant="danger"
                    confirm={{
                      title: 'Record a dispute on this donation?',
                      reasonLabel: 'Dispute details',
                    }}
                  />
                </>
              )}
              {!['pending', 'successful'].includes(donation.paymentStatus) && (
                <p className="text-sm text-[#667085]">
                  No adjustment is available for a {donation.paymentStatus} donation.
                </p>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
