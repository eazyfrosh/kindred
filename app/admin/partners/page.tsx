import Image from 'next/image';
import { ArrowDown, ArrowUp, Trash } from 'lucide-react';
import { listPartners } from '@/lib/admin/content';
import { savePartnerAction, showcaseItemAction } from '@/lib/admin/actions/content';
import { AdminPageHeader, EmptyState, Panel, StatusBadge } from '@/components/admin/ui';
import { ActionButton, AdminForm, SubmitButton } from '@/components/admin/action-form';
import { INPUT, LABEL, LINK } from '@/components/admin/theme';
import type { Partner } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Partners' };

function PartnerForm({ entry }: { entry?: Partner }) {
  return (
    <AdminForm action={savePartnerAction} className="space-y-3 p-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <label className="block text-sm">
        <span className={LABEL}>Partner name</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={entry?.name}
          className={`${INPUT} mt-1`}
        />
      </label>
      <label className="block text-sm">
        <span className={LABEL}>Logo URL</span>
        <input
          name="logo"
          type="url"
          maxLength={2048}
          defaultValue={entry?.logo}
          placeholder="https://firebasestorage.googleapis.com/…"
          className={`${INPUT} mt-1`}
        />
      </label>
      <label className="block text-sm">
        <span className={LABEL}>Website</span>
        <input
          name="website"
          type="url"
          maxLength={2048}
          defaultValue={entry?.website}
          className={`${INPUT} mt-1`}
        />
      </label>
      <label className="block text-sm">
        <span className={LABEL}>Display order</span>
        <input
          name="order"
          type="number"
          min="0"
          max="999"
          defaultValue={entry?.order ?? 0}
          className={`${INPUT} mt-1`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[#344054]">
        <input type="checkbox" name="published" defaultChecked={entry?.published} /> Published on
        the public site
      </label>
      <SubmitButton>{entry ? 'Save partner' : 'Add partner'}</SubmitButton>
    </AdminForm>
  );
}

export default async function AdminPartnersPage() {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const partners = await listPartners();
  return (
    <>
      <AdminPageHeader
        title="Partners"
        description="Organisations shown on the public site, in display order."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {partners.length === 0 ? (
            <Panel>
              <EmptyState title="No partners yet." description="Add the first one alongside." />
            </Panel>
          ) : (
            partners.map((entry, index) => (
              <Panel
                key={entry.id}
                title={entry.name}
                action={
                  <span className="flex items-center gap-1.5">
                    <StatusBadge status={entry.published ? 'approved' : 'draft'} />
                    <ActionButton
                      action={showcaseItemAction}
                      fields={{ collection: 'partners', id: entry.id, action: 'up' }}
                      label=""
                      icon={<ArrowUp size={13} />}
                      className={`!px-2 !py-1 ${index === 0 ? 'pointer-events-none opacity-40' : ''}`}
                    />
                    <ActionButton
                      action={showcaseItemAction}
                      fields={{ collection: 'partners', id: entry.id, action: 'down' }}
                      label=""
                      icon={<ArrowDown size={13} />}
                      className={`!px-2 !py-1 ${
                        index === partners.length - 1 ? 'pointer-events-none opacity-40' : ''
                      }`}
                    />
                    <ActionButton
                      action={showcaseItemAction}
                      fields={{ collection: 'partners', id: entry.id, action: 'delete' }}
                      label=""
                      icon={<Trash size={13} />}
                      variant="danger"
                      className="!px-2 !py-1"
                      confirm={{ title: 'Delete this partner?', confirmLabel: 'Delete' }}
                    />
                  </span>
                }
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {entry.logo ? (
                    <Image
                      src={entry.logo}
                      alt=""
                      width={96}
                      height={40}
                      className="h-10 w-24 object-contain"
                    />
                  ) : (
                    <span className="flex h-10 w-24 items-center justify-center rounded bg-[#f2f4f7] text-xs text-[#98a2b3]">
                      No logo
                    </span>
                  )}
                  {entry.website && (
                    <a
                      href={entry.website}
                      className={LINK}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {entry.website}
                    </a>
                  )}
                </div>
                <details className="border-t border-[#e4e7ec] px-4 py-2.5">
                  <summary className="cursor-pointer text-sm font-medium text-[#193be0]">
                    Edit
                  </summary>
                  <div className="-mx-4">
                    <PartnerForm entry={entry} />
                  </div>
                </details>
              </Panel>
            ))
          )}
        </div>
        <aside>
          <Panel title="Add partner">
            <PartnerForm />
          </Panel>
        </aside>
      </div>
    </>
  );
}
