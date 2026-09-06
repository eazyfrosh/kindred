import { DiscoveryTools } from '@/components/live-details';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CampaignCard, PageHero, Empty } from '@/components/ui';
import { listCampaigns } from '@/services/campaigns';
import { categories } from '@/types';
export const metadata: Metadata = {
  title: 'Explore causes',
  description: 'Discover community-led fundraisers and find your reason to give.',
  alternates: { canonical: '/causes' },
};
export const dynamic = 'force-dynamic';
export default async function Causes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { campaigns, nextCursor } = await listCampaigns(params);
  const next = new URLSearchParams(
    Object.entries({ ...params, cursor: nextCursor }).filter((v): v is [string, string] => !!v[1]),
  );
  return (
    <>
      <DiscoveryTools />
      <PageHero eyebrow="FIND YOUR REASON TO GIVE" title="A cause for every kind of heart.">
        Behind every cause is a community with a plan. Find one you believe in, and help move it
        forward.
      </PageHero>
      <section className="container search-results">
        <form className="filters" action="/causes">
          <label>
            Search causes
            <input
              name="q"
              type="search"
              placeholder="Try education, food, or a place…"
              defaultValue={params.q}
            />
          </label>
          <label>
            Category
            <select name="category" defaultValue={params.category || ''}>
              <option value="">All causes</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Sort by
            <select name="sort" defaultValue={params.sort || 'recent'}>
              <option value="recent">Most recent</option>
              <option value="most-funded">Most funded</option>
              <option value="almost-funded">Almost funded</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <button className="button">Find a cause</button>
        </form>
        <div className="results-meta">
          <span>{campaigns.length} causes on this page</span>
          <span>Community led. Reviewed with care.</span>
        </div>
        <div className="campaign-grid">
          {campaigns.length ? (
            campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)
          ) : (
            <Empty title="No causes match your search.">
              Try a different keyword or <Link href="/causes">clear your filters</Link>.
            </Empty>
          )}
        </div>
        {nextCursor && (
          <div className="pagination">
            <Link className="button secondary" href={`/causes?${next}`}>
              Next page
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
