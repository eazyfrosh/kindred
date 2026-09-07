import { ArrowDown, ArrowUp, Trash } from 'lucide-react';
import { listTestimonials } from '@/lib/admin/content';
import { saveTestimonialAction, showcaseItemAction } from '@/lib/admin/actions/content';
import { AdminPageHeader, EmptyState, Panel, StatusBadge } from '@/components/admin/ui';
import { ActionButton, AdminForm, SubmitButton } from '@/components/admin/action-form';
import { INPUT, LABEL } from '@/components/admin/theme';
import type { Testimonial } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Testimonials' };

function TestimonialForm({ entry }: { entry?: Testimonial }) {
  return (
    <AdminForm action={saveTestimonialAction} className="space-y-3 p-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className={LABEL}>Person name</span>
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={entry?.name}
            className={`${INPUT} mt-1`}
          />
        </label>
        <label className="block text-sm">
          <span className={LABEL}>Role or location</span>
          <input
            name="role"
            maxLength={160}
            defaultValue={entry?.role}
            className={`${INPUT} mt-1`}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className={LABEL}>Quote</span>
        <textarea
          name="quote"
          required
          rows={3}
          maxLength={1200}
          defaultValue={entry?.quote}
          className={`${INPUT} mt-1`}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className={LABEL}>Photo URL</span>
          <input
            name="photo"
            type="url"
            maxLength={2048}
            defaultValue={entry?.photo}
            placeholder="https://firebasestorage.googleapis.com/…"
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
      </div>
      <label className="flex items-center gap-2 text-sm text-[#344054]">
        <input type="checkbox" name="published" defaultChecked={entry?.published} /> Published on
        the public site
      </label>
      <SubmitButton>{entry ? 'Save testimonial' : 'Add testimonial'}</SubmitButton>
    </AdminForm>
  );
}

export default async function AdminTestimonialsPage() {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const testimonials = await listTestimonials();
  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description="Published testimonials appear on the public homepage in display order."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {testimonials.length === 0 ? (
            <Panel>
              <EmptyState title="No testimonials yet." description="Add the first one alongside." />
            </Panel>
          ) : (
            testimonials.map((entry, index) => (
              <Panel
                key={entry.id}
                title={entry.name}
                description={entry.role}
                action={
                  <span className="flex items-center gap-1.5">
                    <StatusBadge status={entry.published ? 'approved' : 'draft'} />
                    <ActionButton
                      action={showcaseItemAction}
                      fields={{ collection: 'testimonials', id: entry.id, action: 'up' }}
                      label=""
                      icon={<ArrowUp size={13} />}
                      className={`!px-2 !py-1 ${index === 0 ? 'pointer-events-none opacity-40' : ''}`}
                    />
                    <ActionButton
                      action={showcaseItemAction}
                      fields={{ collection: 'testimonials', id: entry.id, action: 'down' }}
                      label=""
                      icon={<ArrowDown size={13} />}
                      className={`!px-2 !py-1 ${
                        index === testimonials.length - 1 ? 'pointer-events-none opacity-40' : ''
                      }`}
                    />
                    <ActionButton
                      action={showcaseItemAction}
                      fields={{ collection: 'testimonials', id: entry.id, action: 'delete' }}
                      label=""
                      icon={<Trash size={13} />}
                      variant="danger"
                      className="!px-2 !py-1"
                      confirm={{ title: 'Delete this testimonial?', confirmLabel: 'Delete' }}
                    />
                  </span>
                }
              >
                <p className="px-4 py-3 text-sm italic leading-6 text-[#475467]">“{entry.quote}”</p>
                <details className="border-t border-[#e4e7ec] px-4 py-2.5">
                  <summary className="cursor-pointer text-sm font-medium text-[#193be0]">
                    Edit
                  </summary>
                  <div className="-mx-4">
                    <TestimonialForm entry={entry} />
                  </div>
                </details>
              </Panel>
            ))
          )}
        </div>
        <aside>
          <Panel title="Add testimonial">
            <TestimonialForm />
          </Panel>
        </aside>
      </div>
    </>
  );
}
