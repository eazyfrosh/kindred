import { getHomepageContent } from '@/lib/admin/content';
import { listCampaigns } from '@/lib/admin/campaigns';
import { saveHomepageAction } from '@/lib/admin/actions/content';
import { AdminPageHeader, Panel } from '@/components/admin/ui';
import { AdminForm, SubmitButton } from '@/components/admin/action-form';
import { RepeatableRows } from '@/components/admin/repeatable';
import { INPUT, LABEL } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Homepage content' };

export default async function AdminContentPage() {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const [content, approved] = await Promise.all([
    getHomepageContent(),
    listCampaigns({ status: 'approved', limit: 50 }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Homepage content"
        description="The configurable parts of the public homepage. Testimonials and partners are managed on their own pages."
      />
      <AdminForm action={saveHomepageAction} className="grid gap-4 lg:grid-cols-2">
        <Panel title="Announcement & hero">
          <div className="space-y-3 p-4">
            <label className="block text-sm">
              <span className={LABEL}>Homepage announcement</span>
              <input
                name="announcement"
                maxLength={300}
                defaultValue={content.announcement}
                className={`${INPUT} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className={LABEL}>Hero title</span>
              <input
                name="heroTitle"
                maxLength={160}
                defaultValue={content.heroTitle}
                className={`${INPUT} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className={LABEL}>Hero subtitle</span>
              <textarea
                name="heroSubtitle"
                rows={2}
                maxLength={400}
                defaultValue={content.heroSubtitle}
                className={`${INPUT} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className={LABEL}>Mission statement</span>
              <textarea
                name="mission"
                rows={4}
                maxLength={2000}
                defaultValue={content.mission}
                className={`${INPUT} mt-1`}
              />
            </label>
          </div>
        </Panel>

        <Panel title="Impact statistics">
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className={LABEL}>People reached</span>
              <input
                name="people"
                type="number"
                min="0"
                defaultValue={content.impact.people}
                className={`${INPUT} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className={LABEL}>Countries</span>
              <input
                name="countries"
                type="number"
                min="0"
                max="250"
                defaultValue={content.impact.countries}
                className={`${INPUT} mt-1`}
              />
            </label>
            <label className="block text-sm">
              <span className={LABEL}>Projects</span>
              <input
                name="projects"
                type="number"
                min="0"
                defaultValue={content.impact.projects}
                className={`${INPUT} mt-1`}
              />
            </label>
          </div>
          <div className="border-t border-[#e4e7ec] p-4">
            <RepeatableRows
              legend="Donation impact amounts"
              addLabel="Add impact amount"
              max={8}
              fields={[
                { name: 'amount', label: 'Amount', type: 'number', min: 1 },
                { name: 'label', label: 'What it provides', maxLength: 160 },
              ]}
              initial={content.donationImpacts}
            />
          </div>
        </Panel>

        <Panel title="Featured campaigns" description="Choose up to six approved campaigns.">
          <div className="max-h-72 space-y-1.5 overflow-y-auto p-4">
            {approved.rows.length === 0 ? (
              <p className="text-sm text-[#667085]">No approved campaigns to feature yet.</p>
            ) : (
              approved.rows.map((campaign) => (
                <label key={campaign.id} className="flex items-start gap-2 text-sm text-[#344054]">
                  <input
                    type="checkbox"
                    name="featuredCampaignIds"
                    value={campaign.id}
                    defaultChecked={content.featuredCampaignIds.includes(campaign.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{campaign.title}</span>
                    <span className="block truncate text-xs text-[#667085]">
                      {campaign.category} · {campaign.organizerName}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Frequently asked questions">
          <div className="p-4">
            <RepeatableRows
              legend="FAQ entries"
              addLabel="Add question"
              max={30}
              fields={[
                { name: 'question', label: 'Question', maxLength: 300 },
                { name: 'answer', label: 'Answer', type: 'textarea', maxLength: 3000 },
              ]}
              initial={content.faqs}
            />
          </div>
        </Panel>

        <div className="lg:col-span-2">
          <SubmitButton>Save homepage content</SubmitButton>
        </div>
      </AdminForm>
    </>
  );
}
