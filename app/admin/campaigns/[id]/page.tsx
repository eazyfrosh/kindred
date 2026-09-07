import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Star, StarOff, ShieldCheck, ShieldX, Trash } from 'lucide-react';
import { money, percent } from '@/lib/brand';
import { categories } from '@/types';
import { getCampaignDetail } from '@/lib/admin/campaigns';
import { auditHistoryFor } from '@/lib/admin/audit';
import { moderateCampaignAction, updateCampaignAction } from '@/lib/admin/actions/campaigns';
import {
  AdminPageHeader,
  DateCell,
  EmptyState,
  Panel,
  ProgressBar,
  StatusBadge,
  UserAvatar,
} from '@/components/admin/ui';
import { ActionButton, AdminForm, SubmitButton } from '@/components/admin/action-form';
import { BUTTON_SECONDARY, INPUT, LABEL } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Campaign review' };

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const { id } = await params;
  const [detail, history] = await Promise.all([
    getCampaignDetail(id),
    auditHistoryFor('campaign', id),
  ]);
  if (!detail) notFound();
  const { campaign, organizer, donations, updates, comments } = detail;

  return (
    <>
      <AdminPageHeader title={campaign.title} description={`Campaign ${campaign.id}`}>
        <StatusBadge status={campaign.status} />
        {campaign.status === 'approved' && (
          <Link href={`/campaign/${campaign.slug}`} className={BUTTON_SECONDARY}>
            <ExternalLink size={14} /> View public page
          </Link>
        )}
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            {campaign.coverImage && (
              <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-[#f2f4f7] sm:h-60">
                <Image
                  src={campaign.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className={LABEL}>Raised</p>
                  <p className="mt-1 text-base font-semibold text-[#101828]">
                    {money(campaign.amountRaised, campaign.currency)}
                  </p>
                </div>
                <div>
                  <p className={LABEL}>Goal</p>
                  <p className="mt-1 text-base font-semibold text-[#101828]">
                    {money(campaign.goalAmount, campaign.currency)}
                  </p>
                </div>
                <div>
                  <p className={LABEL}>Donors</p>
                  <p className="mt-1 text-base font-semibold text-[#101828]">
                    {campaign.donorCount || 0}
                  </p>
                </div>
                <div>
                  <p className={LABEL}>Funded</p>
                  <p className="mt-1 text-base font-semibold text-[#101828]">
                    {percent(campaign.amountRaised, campaign.goalAmount)}%
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar raised={campaign.amountRaised} goal={campaign.goalAmount} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e4e7ec] pt-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className={LABEL}>Category</dt>
                  <dd className="mt-0.5 text-[#101828]">{campaign.category}</dd>
                </div>
                <div>
                  <dt className={LABEL}>Location</dt>
                  <dd className="mt-0.5 text-[#101828]">{campaign.location}</dd>
                </div>
                <div>
                  <dt className={LABEL}>Created</dt>
                  <dd className="mt-0.5 text-[#101828]">
                    <DateCell value={campaign.createdAt} />
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Deadline</dt>
                  <dd className="mt-0.5 text-[#101828]">
                    <DateCell value={campaign.endDate} />
                  </dd>
                </div>
                <div>
                  <dt className={LABEL}>Verified</dt>
                  <dd className="mt-0.5 text-[#101828]">{campaign.verified ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className={LABEL}>Featured</dt>
                  <dd className="mt-0.5 text-[#101828]">{campaign.featured ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
              {campaign.moderationReason && (
                <p className="mt-4 rounded-md border border-[#fedf89] bg-[#fffaeb] px-3 py-2 text-sm text-[#b54708]">
                  Last moderation reason: {campaign.moderationReason}
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Organizer">
            {organizer ? (
              <div className="px-4 py-3">
                <UserAvatar
                  name={
                    `${organizer.firstName} ${organizer.lastName}`.trim() || campaign.organizerName
                  }
                  email={organizer.email}
                  photoURL={organizer.photoURL}
                  href={`/admin/users/${campaign.organizerId}`}
                />
                <p className="mt-3 text-sm text-[#475467]">{campaign.organizerBio}</p>
              </div>
            ) : (
              <EmptyState title="Organizer account not found." />
            )}
          </Panel>

          <Panel title="Story">
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-[#475467]">
              {campaign.description}
            </div>
          </Panel>

          {campaign.gallery?.length > 0 && (
            <Panel title="Gallery">
              <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
                {campaign.gallery.map((src: string) => (
                  <div
                    key={src}
                    className="relative aspect-4/3 overflow-hidden rounded bg-[#f2f4f7]"
                  >
                    <Image src={src} alt="" fill sizes="200px" className="object-cover" />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Campaign updates">
            {updates.length === 0 ? (
              <EmptyState title="No updates published." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {updates.map((update) => (
                  <li key={update.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-[#101828]">{update.title}</p>
                    <p className="mt-0.5 line-clamp-3 text-sm text-[#667085]">{update.body}</p>
                    <DateCell value={update.createdAt} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent donations">
            {donations.length === 0 ? (
              <EmptyState title="No donations recorded." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {donations.map((donation) => (
                  <li
                    key={donation.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <Link
                      href={`/admin/donations/${donation.id}`}
                      className="min-w-0 text-sm text-[#101828] hover:underline"
                    >
                      <span className="block truncate font-medium">
                        {money(donation.amount, donation.currency)}
                      </span>
                      <span className="block truncate text-xs text-[#667085]">
                        {donation.donorName}
                      </span>
                    </Link>
                    <StatusBadge status={donation.paymentStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Comments">
            {comments.length === 0 ? (
              <EmptyState title="No comments." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {comments.map((comment) => (
                  <li key={comment.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#101828]">{comment.authorName}</p>
                      <StatusBadge status={comment.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-[#667085]">{comment.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Audit history" description="Every administrator decision on this campaign.">
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
                    {typeof entry.metadata?.reason === 'string' && entry.metadata.reason && (
                      <p className="mt-1 text-xs italic text-[#667085]">
                        “{entry.metadata.reason}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[72px] lg:self-start">
          <Panel title="Moderation" description="Decisions are recorded in the audit log.">
            <div className="flex flex-wrap gap-2 p-4">
              {campaign.status !== 'approved' && (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'approve' }}
                  label="Approve"
                  variant="primary"
                  confirm={{
                    title: 'Approve this campaign?',
                    description: 'It becomes visible on the public site and can receive donations.',
                    confirmLabel: 'Approve campaign',
                  }}
                />
              )}
              <ActionButton
                action={moderateCampaignAction}
                fields={{ id: campaign.id, action: 'reject' }}
                label="Reject"
                variant="danger"
                confirm={{
                  title: 'Reject this campaign?',
                  description: 'The organizer is notified with your reason.',
                  reasonLabel: 'Reason for rejection',
                  confirmLabel: 'Reject campaign',
                }}
              />
              {campaign.status === 'suspended' ? (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'unsuspend' }}
                  label="Unsuspend"
                  confirm={{
                    title: 'Reinstate this campaign?',
                    description: 'It returns to the approved state and becomes public again.',
                  }}
                />
              ) : (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'suspend' }}
                  label="Suspend"
                  variant="danger"
                  confirm={{
                    title: 'Suspend this campaign?',
                    description: 'It is hidden from the public site immediately.',
                    reasonLabel: 'Reason for suspension',
                  }}
                />
              )}
              {campaign.status !== 'completed' && (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'complete' }}
                  label="Mark completed"
                  confirm={{
                    title: 'Mark this campaign completed?',
                    description: 'It stops accepting new donations.',
                  }}
                />
              )}
              {campaign.verified ? (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'unverify' }}
                  label="Unverify"
                  icon={<ShieldX size={14} />}
                  confirm={{
                    title: 'Remove verification?',
                    reasonLabel: 'Reason for removing verification',
                  }}
                />
              ) : (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'verify' }}
                  label="Verify"
                  icon={<ShieldCheck size={14} />}
                />
              )}
              {campaign.featured ? (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'unfeature' }}
                  label="Unfeature"
                  icon={<StarOff size={14} />}
                />
              ) : (
                <ActionButton
                  action={moderateCampaignAction}
                  fields={{ id: campaign.id, action: 'feature' }}
                  label="Feature"
                  icon={<Star size={14} />}
                />
              )}
              <ActionButton
                action={moderateCampaignAction}
                fields={{ id: campaign.id, action: 'delete', redirectTo: '/admin/campaigns' }}
                label="Delete"
                icon={<Trash size={14} />}
                variant="danger"
                confirm={{
                  title: 'Delete this campaign?',
                  description:
                    'Only campaigns with no donations can be deleted. This cannot be undone.',
                  reasonLabel: 'Reason for deletion',
                  confirmLabel: 'Delete permanently',
                }}
              />
            </div>
          </Panel>

          <Panel title="Edit details">
            <AdminForm action={updateCampaignAction} className="space-y-3 p-4">
              <input type="hidden" name="id" value={campaign.id} />
              <label className="block text-sm">
                <span className={LABEL}>Title</span>
                <input
                  name="title"
                  defaultValue={campaign.title}
                  maxLength={120}
                  required
                  className={`${INPUT} mt-1`}
                />
              </label>
              <label className="block text-sm">
                <span className={LABEL}>Category</span>
                <select
                  name="category"
                  defaultValue={campaign.category}
                  className={`${INPUT} mt-1`}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className={LABEL}>Location</span>
                <input
                  name="location"
                  defaultValue={campaign.location}
                  maxLength={120}
                  required
                  className={`${INPUT} mt-1`}
                />
              </label>
              <label className="block text-sm">
                <span className={LABEL}>Summary</span>
                <textarea
                  name="shortDescription"
                  defaultValue={campaign.shortDescription}
                  rows={2}
                  maxLength={240}
                  required
                  className={`${INPUT} mt-1`}
                />
              </label>
              <label className="block text-sm">
                <span className={LABEL}>Story</span>
                <textarea
                  name="description"
                  defaultValue={campaign.description}
                  rows={6}
                  maxLength={30000}
                  required
                  className={`${INPUT} mt-1`}
                />
              </label>
              <label className="block text-sm">
                <span className={LABEL}>Goal amount ({campaign.currency})</span>
                <input
                  name="goalAmount"
                  type="number"
                  step="0.01"
                  min="1"
                  defaultValue={campaign.goalAmount}
                  required
                  className={`${INPUT} mt-1`}
                />
              </label>
              <label className="block text-sm">
                <span className={LABEL}>Deadline</span>
                <input
                  name="endDate"
                  type="date"
                  defaultValue={String(campaign.endDate).slice(0, 10)}
                  required
                  className={`${INPUT} mt-1`}
                />
              </label>
              <SubmitButton>Save changes</SubmitButton>
            </AdminForm>
          </Panel>
        </aside>
      </div>
    </>
  );
}
