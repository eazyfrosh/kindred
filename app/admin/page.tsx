import Link from 'next/link';
import { money } from '@/lib/brand';
import {
  categoryBreakdown,
  dashboardKpis,
  recentActivity,
  revenueSeries,
  topCampaigns,
  userGrowthSeries,
  type ChartRange,
} from '@/lib/admin/analytics';
import {
  AdminPageHeader,
  ChartCard,
  EmptyState,
  Panel,
  ProgressBar,
  StatCard,
  StatusBadge,
} from '@/components/admin/ui';
import { GrowthChart, RankedBarChart, RevenueChart, VolumeChart } from '@/components/admin/charts';
import { ActivityFeed } from '@/components/admin/activity-feed';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Overview' };

const RANGES: { value: ChartRange; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const { range: rangeParam } = await searchParams;
  const range: ChartRange = RANGES.some((option) => option.value === rangeParam)
    ? (rangeParam as ChartRange)
    : 'monthly';

  const [{ kpis, currency }, series, categories, growth, top, activity] = await Promise.all([
    dashboardKpis(),
    revenueSeries(range),
    categoryBreakdown(),
    userGrowthSeries(),
    topCampaigns(6),
    recentActivity(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description={`Platform performance in ${currency}. Amounts are net of recorded refunds; dates use UTC.`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.format === 'money' ? money(kpi.value, currency) : kpi.value.toLocaleString()}
            change={kpi.change}
            changeLabel={kpi.changeLabel}
          />
        ))}
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Donation revenue"
          description={`Confirmed donation value in ${currency}`}
          action={
            <div
              className="flex rounded-md border border-[#d0d5dd] p-0.5"
              role="group"
              aria-label="Chart range"
            >
              {RANGES.map((option) => (
                <Link
                  key={option.value}
                  href={`/admin?range=${option.value}`}
                  aria-current={range === option.value ? 'true' : undefined}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    range === option.value
                      ? 'bg-[#eef2ff] text-[#193be0]'
                      : 'text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          }
        >
          <RevenueChart data={series} currency={currency} />
        </ChartCard>

        <ChartCard title="Donation volume" description="Number of confirmed donations">
          <VolumeChart data={series} />
        </ChartCard>

        <ChartCard
          title="Campaign performance"
          description="Funding progress of the largest campaigns"
        >
          {top.length ? (
            <RankedBarChart
              data={top.map((campaign) => ({
                label:
                  campaign.title.length > 18 ? `${campaign.title.slice(0, 17)}…` : campaign.title,
                value: campaign.percent,
              }))}
              unit="percent"
            />
          ) : (
            <EmptyState title="No approved campaigns yet." />
          )}
        </ChartCard>

        <ChartCard
          title="Donation categories"
          description={`Confirmed donation value by cause, in ${currency}`}
        >
          {categories.length ? (
            <RankedBarChart data={categories} unit="money" currency={currency} />
          ) : (
            <EmptyState title="No confirmed donations yet." />
          )}
        </ChartCard>

        <ChartCard title="User growth" description="New community members each month">
          <GrowthChart data={growth} />
        </ChartCard>

        <Panel title="Top-performing campaigns">
          {top.length === 0 ? (
            <EmptyState title="No approved campaigns yet." />
          ) : (
            <ul className="divide-y divide-[#e4e7ec]">
              {top.map((campaign) => (
                <li key={campaign.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="min-w-0 text-sm font-medium text-[#101828] hover:underline"
                    >
                      <span className="block truncate">{campaign.title}</span>
                      <span className="block truncate text-xs font-normal text-[#667085]">
                        {campaign.category} · {campaign.donorCount} donors
                      </span>
                    </Link>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-[#101828]">
                      {money(campaign.amountRaised, campaign.currency)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar raised={campaign.amountRaised} goal={campaign.goalAmount} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <h2 className="mb-3 text-[15px] font-semibold leading-6 text-[#101828]">Recent activity</h2>
      <ActivityFeed
        sections={[
          {
            title: 'Recent donations',
            href: '/admin/donations',
            emptyText: 'No donations yet.',
            items: activity.donations.map((donation) => ({
              id: donation.id,
              title: money(donation.amount, donation.currency),
              subtitle: `${donation.anonymous ? 'Anonymous' : donation.donorName} · ${donation.campaignTitle}`,
              meta: new Date(donation.createdAt).toLocaleDateString('en-GB'),
              href: `/admin/donations/${donation.id}`,
            })),
          },
          {
            title: 'Pending approvals',
            href: '/admin/campaigns?status=pending',
            emptyText: 'Nothing awaiting review.',
            items: activity.approvals.map((campaign) => ({
              id: campaign.id,
              title: campaign.title,
              subtitle: `${campaign.organizerName} · ${campaign.category}`,
              meta: new Date(campaign.createdAt).toLocaleDateString('en-GB'),
              href: `/admin/campaigns/${campaign.id}`,
            })),
          },
          {
            title: 'New campaigns',
            href: '/admin/campaigns',
            emptyText: 'No campaigns yet.',
            items: activity.campaigns.map((campaign) => ({
              id: campaign.id,
              title: campaign.title,
              subtitle: campaign.organizerName,
              meta: campaign.status,
              href: `/admin/campaigns/${campaign.id}`,
            })),
          },
          {
            title: 'New users',
            href: '/admin/users',
            emptyText: 'No registrations yet.',
            items: activity.users.map((user) => ({
              id: user.uid,
              title: `${user.firstName} ${user.lastName}`.trim() || user.email,
              subtitle: user.email,
              meta: user.role,
              href: `/admin/users/${user.uid}`,
            })),
          },
          {
            title: 'Payout requests',
            href: '/admin/payouts',
            emptyText: 'No payout requests.',
            items: activity.payouts.map((payout) => ({
              id: payout.id,
              title: money(payout.amount, payout.currency),
              subtitle: `${payout.organizerName} · ${payout.campaignTitle}`,
              meta: payout.status,
              href: `/admin/payouts/${payout.id}`,
            })),
          },
          {
            title: 'Volunteer applications',
            href: '/admin/volunteers',
            emptyText: 'No applications yet.',
            items: activity.volunteers.map((volunteer) => ({
              id: volunteer.id,
              title: volunteer.name,
              subtitle: `${volunteer.interest} · ${volunteer.country}`,
              meta: volunteer.status,
              href: '/admin/volunteers',
            })),
          },
        ]}
      />
      <p className="mt-4 text-xs text-[#667085]">
        Status labels: <StatusBadge status="pending" /> awaiting review ·{' '}
        <StatusBadge status="approved" /> live on the public site.
      </p>
    </>
  );
}
