import Link from 'next/link';
import { notFound } from 'next/navigation';
import { money } from '@/lib/brand';
import { getPayoutDetail } from '@/lib/admin/payouts';
import { auditHistoryFor } from '@/lib/admin/audit';
import { transitionPayoutAction } from '@/lib/admin/actions/payouts';
import { maskDestination, payoutProviderConfigured } from '@/services/payouts';
import {
  AdminPageHeader,
  DateCell,
  EmptyState,
  Panel,
  StatCard,
  StatusBadge,
} from '@/components/admin/ui';
import { ActionButton, AdminForm, SubmitButton } from '@/components/admin/action-form';
import { INPUT, LABEL } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Payout review' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e4e7ec] px-4 py-2.5 last:border-0">
      <dt className={LABEL}>{label}</dt>
      <dd className="text-sm text-[#101828]">{children}</dd>
    </div>
  );
}

export default async function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const { id } = await params;
  const [detail, history] = await Promise.all([getPayoutDetail(id), auditHistoryFor('payout', id)]);
  if (!detail) notFound();
  const { payout, balance, previous } = detail;
  const exceedsBalance = payout.amount > balance.available;
  const open = !['paid', 'rejected', 'cancelled'].includes(payout.status);

  return (
    <>
      <AdminPageHeader
        title={money(payout.amount, payout.currency)}
        description={`Payout ${payout.id} · ${payout.campaignTitle}`}
      >
        <StatusBadge status={payout.status} />
      </AdminPageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Campaign donations"
          value={money(balance.raised, balance.currency)}
          hint={`${balance.donationCount} donors`}
        />
        <StatCard label="Refunds & disputes" value={money(balance.refunded, balance.currency)} />
        <StatCard
          label="Platform fees"
          value={money(balance.platformFees, balance.currency)}
          hint="Applied to net donations"
        />
        <StatCard
          label="Available balance"
          value={money(balance.available, balance.currency)}
          hint={`${money(balance.previouslyCommitted, balance.currency)} already committed`}
        />
      </div>

      {exceedsBalance && (
        <p className="mb-4 rounded-md border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]">
          This request exceeds the available balance. Approval will be refused by the server until
          the balance covers it.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel title="Request">
            <dl>
              <Row label="Organizer">
                <Link href={`/admin/users/${payout.organizerId}`} className="hover:underline">
                  {payout.organizerName} · {payout.organizerEmail}
                </Link>
              </Row>
              <Row label="Campaign">
                <Link href={`/admin/campaigns/${payout.campaignId}`} className="hover:underline">
                  {payout.campaignTitle}
                </Link>
              </Row>
              <Row label="Requested amount">{money(payout.amount, payout.currency)}</Row>
              <Row label="Balance when requested">
                {money(payout.availableAtRequest ?? 0, payout.currency)}
              </Row>
              <Row label="Requested">
                <DateCell value={payout.requestedAt} />
              </Row>
              <Row label="Destination">
                <span className="font-mono text-xs">
                  {payout.destinationSummary ? maskDestination(payout.destinationSummary) : '—'}
                </span>
              </Row>
              <Row label="Provider reference">
                <span className="font-mono text-xs">{payout.providerReference || '—'}</span>
              </Row>
              <Row label="Paid">
                <DateCell value={payout.paidAt || undefined} />
              </Row>
            </dl>
            <p className="border-t border-[#e4e7ec] px-4 py-2.5 text-xs text-[#667085]">
              Only a masked destination summary is stored. Full banking credentials stay with the
              payout provider and are never held in Firestore or sent to the browser.
              {payoutProviderConfigured()
                ? ' A payout provider is configured for this deployment.'
                : ' No payout provider is configured — complete the transfer in your banking provider, then record its reference below.'}
            </p>
          </Panel>

          <Panel title="Previous payouts for this campaign">
            {previous.length === 0 ? (
              <EmptyState title="No earlier payout requests." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {previous.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <Link
                      href={`/admin/payouts/${entry.id}`}
                      className="min-w-0 text-sm text-[#101828] hover:underline"
                    >
                      <span className="block truncate font-medium">
                        {money(entry.amount, entry.currency)}
                      </span>
                      <span className="block truncate text-xs text-[#667085]">
                        Requested {new Date(entry.requestedAt).toLocaleDateString('en-GB')}
                      </span>
                    </Link>
                    <StatusBadge status={entry.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Status history">
            {(payout.history || []).length === 0 ? (
              <EmptyState title="No status changes yet." />
            ) : (
              <ol className="divide-y divide-[#e4e7ec]">
                {[...(payout.history || [])].reverse().map((event, index) => (
                  <li key={`${event.status}-${index}`} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-xs text-[#667085]">
                        {event.adminEmail} · {new Date(event.createdAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    {event.note && <p className="mt-1 text-sm text-[#475467]">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Audit history">
            {history.length === 0 ? (
              <EmptyState title="No recorded decisions." />
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
            title="Decision"
            description="Transitions are validated against the current state."
          >
            {!open ? (
              <p className="px-4 py-3 text-sm text-[#667085]">
                This payout is {payout.status.replace('_', ' ')} and cannot change further.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 p-4">
                {payout.status === 'requested' && (
                  <ActionButton
                    action={transitionPayoutAction}
                    fields={{ id: payout.id, action: 'under_review' }}
                    label="Put under review"
                    confirm={{
                      title: 'Move this payout to review?',
                      reasonLabel: 'Note (optional)',
                      reasonRequired: false,
                    }}
                  />
                )}
                {['requested', 'under_review'].includes(payout.status) && (
                  <ActionButton
                    action={transitionPayoutAction}
                    fields={{ id: payout.id, action: 'approve' }}
                    label="Approve"
                    variant="primary"
                    confirm={{
                      title: 'Approve this payout?',
                      description: `The available balance is ${money(balance.available, balance.currency)}. Approval reserves the amount.`,
                      reasonLabel: 'Approval note (optional)',
                      reasonRequired: false,
                    }}
                  />
                )}
                {payout.status === 'approved' && (
                  <ActionButton
                    action={transitionPayoutAction}
                    fields={{ id: payout.id, action: 'processing' }}
                    label="Mark processing"
                    confirm={{
                      title: 'Mark this payout as processing?',
                      description: 'Use this once the transfer has been submitted to the provider.',
                      reasonLabel: 'Note (optional)',
                      reasonRequired: false,
                    }}
                  />
                )}
                {payout.status !== 'processing' && (
                  <ActionButton
                    action={transitionPayoutAction}
                    fields={{ id: payout.id, action: 'reject' }}
                    label="Reject"
                    variant="danger"
                    confirm={{
                      title: 'Reject this payout request?',
                      description: 'The organizer is notified with your reason.',
                      reasonLabel: 'Reason for rejection',
                    }}
                  />
                )}
                <ActionButton
                  action={transitionPayoutAction}
                  fields={{ id: payout.id, action: 'cancel' }}
                  label="Cancel"
                  variant="danger"
                  confirm={{
                    title: 'Cancel this payout request?',
                    reasonLabel: 'Reason for cancelling',
                  }}
                />
              </div>
            )}
          </Panel>

          {payout.status === 'processing' && (
            <Panel title="Record settlement">
              <AdminForm action={transitionPayoutAction} className="space-y-3 p-4">
                <input type="hidden" name="id" value={payout.id} />
                <input type="hidden" name="action" value="paid" />
                <label className="block text-sm">
                  <span className={LABEL}>Provider reference</span>
                  <input
                    name="providerReference"
                    required
                    maxLength={160}
                    placeholder="Bank or provider transfer reference"
                    className={`${INPUT} mt-1`}
                  />
                </label>
                <label className="block text-sm">
                  <span className={LABEL}>Note</span>
                  <textarea name="note" rows={3} maxLength={2000} className={`${INPUT} mt-1`} />
                </label>
                <SubmitButton>Mark paid</SubmitButton>
              </AdminForm>
            </Panel>
          )}

          <Panel title="Admin notes">
            <AdminForm action={transitionPayoutAction} className="space-y-3 p-4">
              <input type="hidden" name="id" value={payout.id} />
              <input type="hidden" name="action" value="notes" />
              <label className="block">
                <span className="sr-only">Admin notes</span>
                <textarea
                  name="note"
                  rows={4}
                  maxLength={5000}
                  defaultValue={payout.adminNotes || ''}
                  className={INPUT}
                />
              </label>
              <SubmitButton>Save notes</SubmitButton>
            </AdminForm>
          </Panel>
        </aside>
      </div>
    </>
  );
}
