import { getPlatformSettings } from '@/lib/admin/content';
import { saveSettingsAction } from '@/lib/admin/actions/content';
import { AdminPageHeader, Panel } from '@/components/admin/ui';
import { AdminForm, SubmitButton } from '@/components/admin/action-form';
import { INPUT, LABEL } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Settings' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#344054]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} /> {label}
    </label>
  );
}

export default async function AdminSettingsPage() {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const settings = await getPlatformSettings();
  return (
    <>
      <AdminPageHeader
        title="Settings"
        description={
          settings.updatedAt
            ? `Last updated ${new Date(settings.updatedAt).toLocaleString('en-GB')} by ${settings.updatedBy}`
            : 'Platform-wide configuration.'
        }
      />
      <AdminForm action={saveSettingsAction} className="grid gap-4 lg:grid-cols-2">
        <Panel title="General">
          <div className="space-y-3 p-4">
            <Field label="Organization name">
              <input
                name="organizationName"
                required
                maxLength={120}
                defaultValue={settings.general.organizationName}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Field label="Website name">
              <input
                name="websiteName"
                required
                maxLength={120}
                defaultValue={settings.general.websiteName}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Field label="Support email">
              <input
                name="supportEmail"
                type="email"
                required
                maxLength={254}
                defaultValue={settings.general.supportEmail}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Field label="Default currency">
              <select
                name="defaultCurrency"
                defaultValue={settings.general.defaultCurrency}
                className={`${INPUT} mt-1`}
              >
                {['USD', 'NGN', 'GBP', 'EUR'].map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <input
                name="timezone"
                required
                maxLength={64}
                defaultValue={settings.general.timezone}
                className={`${INPUT} mt-1`}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Donations">
          <div className="space-y-3 p-4">
            <Field label="Minimum donation">
              <input
                name="minimumDonation"
                type="number"
                min="1"
                step="0.01"
                defaultValue={settings.donations.minimumDonation}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Field label="Suggested amounts (comma separated)">
              <input
                name="suggestedAmounts"
                defaultValue={settings.donations.suggestedAmounts.join(', ')}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Toggle
              name="recurringEnabled"
              label="Enable recurring (monthly) donations"
              defaultChecked={settings.donations.recurringEnabled}
            />
            <Toggle
              name="anonymousAllowed"
              label="Allow anonymous donations"
              defaultChecked={settings.donations.anonymousAllowed}
            />
          </div>
        </Panel>

        <Panel title="Campaigns">
          <div className="space-y-3 p-4">
            <Toggle
              name="requireApproval"
              label="Require administrator approval before a campaign goes live"
              defaultChecked={settings.campaigns.requireApproval}
            />
            <Field label="Default campaign duration (days)">
              <input
                name="defaultDurationDays"
                type="number"
                min="7"
                max="365"
                defaultValue={settings.campaigns.defaultDurationDays}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Toggle
              name="allowComments"
              label="Allow comments on campaigns"
              defaultChecked={settings.campaigns.allowComments}
            />
            <Toggle
              name="allowUpdates"
              label="Allow organizers to post campaign updates"
              defaultChecked={settings.campaigns.allowUpdates}
            />
          </div>
        </Panel>

        <Panel title="Platform fees" description="Used to calculate available payout balances.">
          <div className="space-y-3 p-4">
            <Field label="Percentage fee (%)">
              <input
                name="percentage"
                type="number"
                min="0"
                max="30"
                step="0.1"
                defaultValue={settings.fees.percentage}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Field label="Fixed fee per donation">
              <input
                name="fixed"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={settings.fees.fixed}
                className={`${INPUT} mt-1`}
              />
            </Field>
            <Toggle
              name="displayFees"
              label="Show fee information to donors"
              defaultChecked={settings.fees.displayFees}
            />
          </div>
        </Panel>

        <Panel title="Social links">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {(['facebook', 'instagram', 'x', 'linkedin', 'youtube'] as const).map((network) => (
              <Field key={network} label={network === 'x' ? 'X (Twitter)' : network}>
                <input
                  name={network}
                  type="url"
                  maxLength={2048}
                  defaultValue={settings.social[network]}
                  placeholder="https://"
                  className={`${INPUT} mt-1`}
                />
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="Payment credentials">
          <p className="px-4 py-3 text-sm leading-6 text-[#667085]">
            Payment and payout provider secrets are deliberately not editable here. They are read
            from environment variables (or your secret manager) on the server only, so a compromised
            admin session can never read or replace them. Rotate them in your deployment
            configuration.
          </p>
        </Panel>

        <div className="lg:col-span-2">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </AdminForm>
    </>
  );
}
