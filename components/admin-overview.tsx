import { db } from '@/firebase/admin';
import { serialize } from '@/lib/security';
import { money } from '@/lib/brand';
import { DonationTable, BarChart } from './workspace';
import { Empty } from './ui';
import type { Campaign, Donation } from '@/types';
export async function AdminOverview() {
  const now = new Date(),
    today = now.toISOString().slice(0, 10),
    month = today.slice(0, 7);
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return {
      id: start.toISOString().slice(0, 7),
      label: start.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      start: start.toISOString(),
      end: end.toISOString(),
    };
  });
  const [
    donationsSnap,
    campaignsSnap,
    userCount,
    active,
    pending,
    completed,
    metricsSnap,
    todaySnap,
    monthSnap,
    revenue,
    growth,
  ] = await Promise.all([
    db().collection('donations').orderBy('createdAt', 'desc').limit(8).get(),
    db()
      .collection('campaigns')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(6)
      .get(),
    db().collection('users').count().get(),
    db().collection('campaigns').where('status', '==', 'approved').count().get(),
    db().collection('campaigns').where('status', '==', 'pending').count().get(),
    db().collection('campaigns').where('status', '==', 'completed').count().get(),
    db().collection('siteSettings').doc('metrics').get(),
    db().collection('_revenuePeriods').doc(today).get(),
    db().collection('_revenuePeriods').doc(month).get(),
    db().getAll(...months.map((m) => db().collection('_revenuePeriods').doc(m.id))),
    Promise.all(
      months.map((m) =>
        db()
          .collection('users')
          .where('createdAt', '>=', m.start)
          .where('createdAt', '<', m.end)
          .count()
          .get(),
      ),
    ),
  ]);
  const metrics = metricsSnap.data() || {};
  const donations = serialize(
    donationsSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Donation),
  );
  const campaigns = campaignsSnap.docs.map((d) => d.data() as Campaign);
  const values = [
    ['Total net donations · USD', money(metrics.raisedUSD || 0)],
    ['Donations today · USD', money(todaySnap.data()?.raisedUSD || 0)],
    ['This month · USD', money(monthSnap.data()?.raisedUSD || 0)],
    ['Total users', userCount.data().count],
    ['Active fundraisers', active.data().count],
    ['Pending campaigns', pending.data().count],
    ['Completed campaigns', completed.data().count],
    [
      'Average net gift · USD',
      money(metrics.countUSD ? (metrics.raisedUSD || 0) / metrics.countUSD : 0),
    ],
  ];
  const categoryValues = Object.entries(metrics.categoryUSD || {}).map(([label, value]) => ({
    label,
    value: Number(value),
  }));
  return (
    <>
      <div className="metric-grid">
        {values.map(([title, value]) => (
          <div className="metric" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="small muted">
        Revenue is shown in USD, net of recorded refunds. Other currencies remain separate in the
        donation ledger. Dates use UTC.
      </p>
      <div className="dashboard-charts">
        <div className="panel">
          <h2>Donation revenue · USD</h2>
          <BarChart
            label="Donation revenue in USD"
            data={months.map((m, i) => ({
              label: m.label,
              value: revenue[i].data()?.raisedUSD || 0,
            }))}
          />
        </div>
        <div className="panel">
          <h2>New community members</h2>
          <BarChart
            label="User growth"
            data={months.map((m, i) => ({ label: m.label, value: growth[i].data().count }))}
          />
        </div>
        <div className="panel">
          <h2>Donation categories · USD</h2>
          {categoryValues.length ? (
            <BarChart label="Donation totals by category in USD" data={categoryValues} />
          ) : (
            <p>No confirmed donations yet.</p>
          )}
        </div>
        <div className="panel">
          <h2>Recent campaign performance · %</h2>
          <BarChart
            label="Campaign funding percentage"
            data={campaigns.map((c) => ({
              label: c.title.split(' ').slice(0, 2).join(' '),
              value: Math.round((c.amountRaised / c.goalAmount) * 100),
            }))}
          />
        </div>
      </div>
      <div className="panel">
        <h2>Recent transactions</h2>
        {donations.length ? (
          <DonationTable donations={donations} admin />
        ) : (
          <Empty title="No transactions yet." />
        )}
      </div>
    </>
  );
}
