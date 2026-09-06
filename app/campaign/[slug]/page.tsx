import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, Heart, MapPin } from 'lucide-react';
import { getCampaign, campaignActivity, listCampaigns } from '@/services/campaigns';
import { CampaignCard, Progress, Empty, ButtonLink, SectionHeading } from '@/components/ui';
import { CampaignActions, CommentForm } from '@/components/campaign-actions';
import { CampaignView } from '@/components/live-details';
import { brand, money, daysLeft } from '@/lib/brand';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const c = await getCampaign((await params).slug);
  if (!c) return { title: 'Campaign not found' };
  return {
    title: c.title,
    description: c.shortDescription,
    alternates: { canonical: `/campaign/${c.slug}` },
    openGraph: {
      title: c.title,
      description: c.shortDescription,
      url: `${brand.url}/campaign/${c.slug}`,
      images: [{ url: c.coverImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: c.title,
      description: c.shortDescription,
      images: [c.coverImage],
    },
  };
}
export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCampaign((await params).slug);
  if (!c) notFound();
  const [activity, related] = await Promise.all([
    campaignActivity(c.id),
    listCampaigns({ category: c.category, limit: 4 }),
  ]);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: c.title,
    description: c.shortDescription,
    url: `${brand.url}/campaign/${c.slug}`,
    image: c.coverImage,
  };
  return (
    <div className="container">
      <CampaignView id={c.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\u003c') }}
      />
      <div className="breadcrumb">
        <Link href="/causes">Explore causes</Link> / {c.category}
      </div>
      <div className="campaign-title">
        <div className="eyebrow">
          {c.category.toUpperCase()} · {c.verified ? 'REVIEWED CAMPAIGN' : 'COMMUNITY CAMPAIGN'}
        </div>
        <h1>{c.title}</h1>
        <div className="organizer">
          <span className="avatar">{c.organizerName[0]}</span>Organized by{' '}
          <strong>{c.organizerName}</strong>
          {c.verified && <ShieldCheck size={17} />}
          <MapPin size={15} />
          {c.location}
        </div>
      </div>
      <div className="campaign-detail-grid">
        <div>
          <div className="detail-cover">
            <Image
              src={c.coverImage}
              alt={`${c.category} project — campaign cover`}
              fill
              priority
              sizes="(max-width: 600px) 100vw, 60vw"
            />
          </div>
          <nav className="detail-nav" aria-label="Campaign sections">
            {['Story', 'Updates', 'Gallery', 'Supporters', 'Allocation', 'Organizer'].map((x) => (
              <a href={`#${x.toLowerCase()}`} key={x}>
                {x}
              </a>
            ))}
          </nav>
          <section className="detail-section prose" id="story">
            <h2>A story worth being part of.</h2>
            <ReactMarkdown>{c.description}</ReactMarkdown>
          </section>
          <section className="detail-section" id="updates">
            <h2>From the ground</h2>
            {activity.updates.length ? (
              activity.updates.map((u) => (
                <article className="record-card" key={u.id}>
                  <span className="small muted">{new Date(u.createdAt).toLocaleDateString()}</span>
                  <h3>{u.title}</h3>
                  <ReactMarkdown>{u.body}</ReactMarkdown>
                  {u.image && (
                    <div className="gallery-image">
                      <Image src={u.image} alt={u.title} fill sizes="50vw" />
                    </div>
                  )}
                </article>
              ))
            ) : (
              <Empty title="The next chapter is on its way.">
                The organizer will share progress and updates here.
              </Empty>
            )}
          </section>
          <section className="detail-section" id="gallery">
            <h2>A closer look</h2>
            <div className="gallery-grid">
              {c.gallery.map((src, i) => (
                <div className="gallery-image" key={src}>
                  <Image
                    src={src}
                    alt={`${c.title} gallery photograph ${i + 1}`}
                    fill
                    sizes="(max-width:600px) 100vw, 30vw"
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="detail-section" id="supporters">
            <h2>A community of kindness</h2>
            {activity.donors.length ? (
              activity.donors.map((d) => (
                <div className="record-card" key={d.id}>
                  <strong>{d.donorName}</strong>
                  <p>
                    {money(Number(d.amount), String(d.currency))} ·{' '}
                    {new Date(String(d.createdAt)).toLocaleDateString()}
                  </p>
                  <p>{d.message}</p>
                </div>
              ))
            ) : (
              <Empty title="Be part of the story.">
                Confirmed donations appear here. Anonymous donors remain anonymous.
              </Empty>
            )}
            <h3 className="mt-8">Words of encouragement</h3>
            {activity.comments.map((x) => (
              <div className="record-card" key={x.id}>
                <strong>{x.authorName}</strong>
                <p>{x.message}</p>
              </div>
            ))}
            <CommentForm campaignId={c.id} />
          </section>
          <section className="detail-section" id="allocation">
            <h2>Where your support goes</h2>
            {c.allocation.map((a) => (
              <div className="allocation-item" key={a.label}>
                <div className="allocation-row">
                  <span>{a.label}</span>
                  <strong>{a.percent}%</strong>
                </div>
                <Progress raised={a.percent} goal={100} />
              </div>
            ))}
          </section>
          <section className="detail-section" id="organizer">
            <h2>Meet {c.organizerName}</h2>
            <p>{c.organizerBio}</p>
            <p className="small muted">
              {c.verified
                ? 'This campaign has been reviewed by the platform team. Review is not a guarantee of an outcome.'
                : 'This organizer’s information is provided by the organizer.'}
            </p>
          </section>
        </div>
        <aside className="donation-sidebar panel">
          <div className="large-amount">{money(c.amountRaised, c.currency)}</div>
          <p className="small">raised of {money(c.goalAmount, c.currency)} goal</p>
          <Progress raised={c.amountRaised} goal={c.goalAmount} />
          <div className="detail-counts">
            <div>
              <strong>{c.donorCount}</strong>
              <span>donors</span>
            </div>
            <div>
              <strong>{c.shareCount}</strong>
              <span>shares</span>
            </div>
            <div>
              <strong>{daysLeft(c.endDate)}</strong>
              <span>days left</span>
            </div>
          </div>
          <ButtonLink href={`/donate/${c.id}`}>
            <Heart size={18} />
            Donate to this cause
          </ButtonLink>
          <CampaignActions id={c.id} title={c.title} />
          <p className="small muted mt-6">
            <ShieldCheck size={16} className="inline mr-1" /> Secure checkout through your payment
            provider. Your card details never reach Kindred.
          </p>
        </aside>
      </div>
      <section className="section">
        <SectionHeading title="More ways to make a difference." />
        <div className="campaign-grid">
          {related.campaigns
            .filter((r) => r.id !== c.id)
            .slice(0, 3)
            .map((r) => (
              <CampaignCard key={r.id} campaign={r} />
            ))}
        </div>
      </section>
    </div>
  );
}
