import 'server-only';
import { db } from '@/firebase/admin';
import { serialize } from '@/lib/security';
import type { Campaign, Donation, UserProfile } from '@/types';
import type { Payout, VolunteerApplication } from '@/types/admin';
import { countOf } from './query';
import { cached } from './cache';
import { getPlatformSettings } from './content';
import { payoutTotals } from './payouts';

export type ChartRange = 'daily' | 'weekly' | 'monthly';

export interface KpiValue {
  label: string;
  value: number;
  format: 'money' | 'number';
  change: number | null;
  changeLabel?: string;
}

export interface SeriesPoint {
  label: string;
  revenue: number;
  volume: number;
}

const DAY = 86_400_000;
const dayId = (date: Date) => date.toISOString().slice(0, 10);
const monthId = (date: Date) => date.toISOString().slice(0, 7);

function change(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Reads the pre-aggregated revenue period documents in a single batched get. */
async function revenuePeriods(ids: string[], currency: string) {
  if (ids.length === 0) return [];
  const snaps = await db().getAll(...ids.map((id) => db().collection('_revenuePeriods').doc(id)));
  return snaps.map((snap) => {
    const data = snap.data() || {};
    return {
      revenue: Number(data[`raised${currency}`] || 0),
      volume: Number(data[`count${currency}`] || 0),
    };
  });
}

export async function dashboardKpis() {
  const settings = await getPlatformSettings();
  const currency = settings.general.defaultCurrency;
  return cached(`kpis:${currency}`, 60_000, async () => {
    const now = new Date();
    const today = dayId(now);
    const yesterday = dayId(new Date(now.getTime() - DAY));
    const thisMonth = monthId(now);
    const lastMonth = monthId(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
    const monthStart = `${thisMonth}-01T00:00:00.000Z`;
    const lastMonthStart = `${lastMonth}-01T00:00:00.000Z`;
    const campaigns = db().collection('campaigns');
    const users = db().collection('users');

    const [
      metricsSnap,
      periods,
      totalUsers,
      usersThisMonth,
      usersLastMonth,
      fundraisers,
      active,
      pending,
      completed,
      payouts,
    ] = await Promise.all([
      db().collection('siteSettings').doc('metrics').get(),
      revenuePeriods([today, yesterday, thisMonth, lastMonth], currency),
      countOf(users),
      countOf(users.where('createdAt', '>=', monthStart)),
      countOf(users.where('createdAt', '>=', lastMonthStart).where('createdAt', '<', monthStart)),
      countOf(users.where('role', '==', 'fundraiser')),
      countOf(campaigns.where('status', '==', 'approved')),
      countOf(campaigns.where('status', '==', 'pending')),
      countOf(campaigns.where('status', '==', 'completed')),
      payoutTotals(),
    ]);

    const metrics = metricsSnap.data() || {};
    const totalRaised = Number(metrics[`raised${currency}`] || 0);
    const totalCount = Number(metrics[`count${currency}`] || 0);
    const [todayPeriod, yesterdayPeriod, monthPeriod, lastMonthPeriod] = periods;

    const kpis: KpiValue[] = [
      {
        label: 'Total donations',
        value: totalRaised,
        format: 'money',
        change: null,
      },
      {
        label: 'Donations today',
        value: todayPeriod.revenue,
        format: 'money',
        change: change(todayPeriod.revenue, yesterdayPeriod.revenue),
        changeLabel: 'vs yesterday',
      },
      {
        label: 'Donations this month',
        value: monthPeriod.revenue,
        format: 'money',
        change: change(monthPeriod.revenue, lastMonthPeriod.revenue),
        changeLabel: 'vs last month',
      },
      {
        label: 'Total donors',
        value: Number(metrics.donorCount || 0),
        format: 'number',
        change: null,
      },
      {
        label: 'Total users',
        value: totalUsers,
        format: 'number',
        change: change(usersThisMonth, usersLastMonth),
        changeLabel: 'new vs last month',
      },
      { label: 'Total fundraisers', value: fundraisers, format: 'number', change: null },
      { label: 'Active campaigns', value: active, format: 'number', change: null },
      { label: 'Pending campaigns', value: pending, format: 'number', change: null },
      { label: 'Completed campaigns', value: completed, format: 'number', change: null },
      {
        label: 'Average donation',
        value: totalCount ? totalRaised / totalCount : 0,
        format: 'money',
        change: null,
      },
      { label: 'Awaiting payout', value: payouts.awaitingAmount, format: 'money', change: null },
      { label: 'Total paid out', value: payouts.paidAmount, format: 'money', change: null },
    ];
    return { kpis, currency, donationsToday: todayPeriod.volume };
  });
}

/** Revenue and volume series for the range selected on the overview. */
export async function revenueSeries(range: ChartRange) {
  const settings = await getPlatformSettings();
  const currency = settings.general.defaultCurrency;
  return cached(`series:${range}:${currency}`, 60_000, async (): Promise<SeriesPoint[]> => {
    const now = new Date();
    if (range === 'monthly') {
      const months = Array.from(
        { length: 12 },
        (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1)),
      );
      const values = await revenuePeriods(months.map(monthId), currency);
      return months.map((date, i) => ({
        label: date.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        ...values[i],
      }));
    }
    const dayCount = range === 'daily' ? 30 : 84;
    const days = Array.from(
      { length: dayCount },
      (_, i) => new Date(now.getTime() - (dayCount - 1 - i) * DAY),
    );
    const values = await revenuePeriods(days.map(dayId), currency);
    if (range === 'daily')
      return days.map((date, i) => ({
        label: date.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        ...values[i],
      }));
    const weeks: SeriesPoint[] = [];
    for (let start = 0; start < dayCount; start += 7) {
      const slice = values.slice(start, start + 7);
      weeks.push({
        label: days[start].toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
        revenue: slice.reduce((sum, v) => sum + v.revenue, 0),
        volume: slice.reduce((sum, v) => sum + v.volume, 0),
      });
    }
    return weeks;
  });
}

export async function categoryBreakdown() {
  const settings = await getPlatformSettings();
  const currency = settings.general.defaultCurrency;
  return cached(`categories:${currency}`, 60_000, async () => {
    const snap = await db().collection('siteSettings').doc('metrics').get();
    const raw = (snap.data()?.[`category${currency}`] || {}) as Record<string, number>;
    return Object.entries(raw)
      .map(([label, value]) => ({ label, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  });
}

export async function userGrowthSeries() {
  return cached('userGrowth', 300_000, async () => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
      return { start, end };
    });
    const counts = await Promise.all(
      months.map(({ start, end }) =>
        countOf(
          db()
            .collection('users')
            .where('createdAt', '>=', start.toISOString())
            .where('createdAt', '<', end.toISOString()),
        ),
      ),
    );
    return months.map(({ start }, i) => ({
      label: start.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      value: counts[i],
    }));
  });
}

export async function topCampaigns(limit = 6) {
  return cached(`topCampaigns:${limit}`, 60_000, async () => {
    const snap = await db()
      .collection('campaigns')
      .where('status', '==', 'approved')
      .orderBy('amountRaised', 'desc')
      .limit(limit)
      .get();
    return serialize(
      snap.docs.map((d) => {
        const c = d.data() as Campaign;
        return {
          id: d.id,
          title: c.title,
          slug: c.slug,
          category: c.category,
          amountRaised: Number(c.amountRaised || 0),
          goalAmount: Number(c.goalAmount || 0),
          donorCount: Number(c.donorCount || 0),
          currency: c.currency || 'USD',
          percent: c.goalAmount > 0 ? Math.round((c.amountRaised / c.goalAmount) * 100) : 0,
        };
      }),
    );
  });
}

export async function recentActivity() {
  const [donations, campaigns, users, approvals, payouts, volunteers] = await Promise.all([
    db()
      .collection('donations')
      .where('paymentStatus', '==', 'successful')
      .orderBy('createdAt', 'desc')
      .limit(6)
      .get(),
    db().collection('campaigns').orderBy('createdAt', 'desc').limit(6).get(),
    db().collection('users').orderBy('createdAt', 'desc').limit(6).get(),
    db()
      .collection('campaigns')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(6)
      .get(),
    db().collection('payouts').orderBy('requestedAt', 'desc').limit(6).get(),
    db().collection('volunteerApplications').orderBy('createdAt', 'desc').limit(6).get(),
  ]);
  return serialize({
    donations: donations.docs.map((d) => ({ ...(d.data() as Donation), id: d.id })),
    campaigns: campaigns.docs.map((d) => ({ ...(d.data() as Campaign), id: d.id })),
    users: users.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })),
    approvals: approvals.docs.map((d) => ({ ...(d.data() as Campaign), id: d.id })),
    payouts: payouts.docs.map((d) => ({ ...(d.data() as Payout), id: d.id })),
    volunteers: volunteers.docs.map((d) => ({ ...(d.data() as VolunteerApplication), id: d.id })),
  });
}
