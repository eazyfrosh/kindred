import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Heart, ShieldCheck, Sprout, Globe, Quote } from 'lucide-react';
import { ButtonLink, CampaignCard, Eyebrow, SectionHeading, Empty } from '@/components/ui';
import { listCampaigns, getContent, impactStats, featuredCampaigns } from '@/services/campaigns';
import { photos } from '@/lib/demo';
import { demoMode } from '@/lib/brand';
import { AnimatedNumber } from '@/components/live-details';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [{ campaigns }, content, stats, featured] = await Promise.all([
    listCampaigns({ limit: 9 }),
    getContent(),
    impactStats(),
    featuredCampaigns(),
  ]);
  return (
    <>
      {content.announcement && <div className="announcement">{content.announcement}</div>}
      <section className="hero container">
        <div className="hero-copy">
          <Eyebrow>GOOD STARTS WITH US</Eyebrow>
          <h1>
            A little kindness.
            <br />A world of
            <br />
            <span>possibility.</span>
            <span className="hero-asterisk" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>
            Big change begins with people who care.
            <br />
            Support a cause, lift a community, and be part of something that lasts.
          </p>
          <div className="button-row">
            <ButtonLink href="/causes">
              Donate now <ArrowUpRight size={18} />
            </ButtonLink>
            <ButtonLink href="/start-a-fundraiser" secondary>
              Start a fundraiser <ArrowRight size={17} />
            </ButtonLink>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <span>AM</span>
              <span>JO</span>
              <span>LK</span>
              <span>
                <Heart size={16} />
              </span>
            </div>
            <div>
              <strong>Every act of giving matters.</strong>
              <br />
              <span>A community built on care.</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src={photos.hero}
            alt="Community volunteers sharing donated supplies"
            fill
            priority
            sizes="(max-width: 850px) 100vw, 55vw"
          />
          <div className="image-shade" />
          <span className="hero-photo-tag">
            <span /> PEOPLE HELPING PEOPLE
          </span>
          <div className="hero-image-copy">
            Together is how
            <br />
            we change things.
          </div>
          <div className="floating-impact">
            <span className="round-icon">
              <Sprout size={24} />
            </span>
            <div>
              <strong>A better tomorrow</strong>
              <span>starts with what we do today.</span>
            </div>
            <ArrowUpRight size={22} />
          </div>
          <div className="hero-sticker">
            <Heart size={22} />
            <span>
              GIVE A LITTLE.
              <br />
              CHANGE A LOT.
            </span>
          </div>
        </div>
      </section>
      <section className="stats-section container">
        <div>
          <strong>
            <AnimatedNumber value={stats.raised} currency />
          </strong>
          <span>Generosity put into action · USD</span>
        </div>
        <div>
          <strong>
            <AnimatedNumber value={stats.donors} />
            <span>+</span>
          </strong>
          <span>Acts of giving</span>
        </div>
        <div>
          <strong>{stats.active}</strong>
          <span>Causes creating change</span>
        </div>
        <div>
          <strong>
            <AnimatedNumber value={stats.people} />
            <span>+</span>
          </strong>
          <span>People supported</span>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow="FIND YOUR REASON TO GIVE"
          title="Good causes. Real possibilities."
          link="/causes"
        >
          Find a story that speaks to you. Help write its next chapter.
        </SectionHeading>
        <div className="category-links">
          {['All causes', 'Education', 'Food', 'Healthcare', 'Environment', 'Community'].map(
            (c, i) => (
              <Link
                className={i === 0 ? 'active' : ''}
                key={c}
                href={i === 0 ? '/causes' : `/causes?category=${c}`}
              >
                {c}
              </Link>
            ),
          )}
        </div>
        <div className="campaign-grid">
          {featured.length ? (
            featured.map((c) => <CampaignCard key={c.id} campaign={c} />)
          ) : (
            <Empty title="New possibilities are on the way." />
          )}
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <SectionHeading
            eyebrow="SMALL STEPS. MEANINGFUL CHANGE."
            title="Kindness is simpler than you think."
          />
          <div className="steps-grid">
            {[
              [Heart, '01', 'Find your cause', 'Choose a community or a story you believe in.'],
              [
                ShieldCheck,
                '02',
                'Give with confidence',
                'Choose your amount and give through secure checkout.',
              ],
              [
                Sprout,
                '03',
                'See your impact',
                'Follow updates and see what your kindness makes possible.',
              ],
            ].map(([Icon, n, title, desc]) => {
              const I = Icon as typeof Heart;
              return (
                <div className="step" key={String(n)}>
                  <div className="step-top">
                    <I size={29} />
                    <span>{String(n)}</span>
                  </div>
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="mission-section container section">
        <div className="mission-photo">
          <Image
            src={photos.trees}
            alt="Volunteers planting a tree together"
            fill
            sizes="(max-width: 800px) 100vw, 45vw"
          />
          <span className="photo-caption">BETTER, TOGETHER.</span>
        </div>
        <div className="mission-copy">
          <Eyebrow>A SHARED BELIEF</Eyebrow>
          <h2>
            The world gets better
            <br />
            when we show up
            <br />
            for each other.
          </h2>
          <p>
            We believe in the power of ordinary people to do extraordinary good. In neighbors
            helping neighbors. In small ideas that grow into lasting change.
          </p>
          <p>
            Kindred connects people who want to help with communities ready to make a difference.
          </p>
          <ButtonLink href="/about" secondary>
            Get to know Kindred <ArrowUpRight size={18} />
          </ButtonLink>
          <div className="trust-row">
            <ShieldCheck size={20} />
            <span>Reviewed causes</span>
            <Globe size={20} />
            <span>Community led</span>
          </div>
        </div>
      </section>
      <section className="impact-strip">
        <div className="container">
          <SectionHeading eyebrow="YOUR KINDNESS GOES FURTHER" title="A little can mean a lot." />
          <div className="impact-options">
            {[
              [
                '25',
                'Learning essentials',
                'Could help equip a child with notebooks and classroom supplies.',
              ],
              [
                '50',
                'A fuller table',
                'Could support a family with a week of nourishing ingredients.',
              ],
              [
                '100',
                'Stronger roots',
                'Could help a community nursery grow and care for new trees.',
              ],
            ].map(([amount, title, copy]) => (
              <Link href="/causes" className="impact-option" key={amount}>
                <strong>
                  <span>$</span>
                  {amount}
                </strong>
                <h3>{title}</h3>
                <p>{copy}</p>
                <ArrowUpRight size={24} />
              </Link>
            ))}
          </div>
          <p className="small">Illustrative estimates. Actual impact and costs vary by campaign.</p>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow="THE PEOPLE BEHIND THE POSSIBILITY"
          title="Every cause starts with someone."
        />
        <div className="story-grid">
          {campaigns.slice(0, 2).map((c) => (
            <Link href={`/campaign/${c.slug}`} className="story-card" key={c.id}>
              <Image
                src={c.coverImage}
                alt={`${c.category} project — illustrative photograph`}
                fill
                sizes="(max-width: 700px) 100vw, 50vw"
              />
              <div className="image-shade" />
              <div>
                <span className="eyebrow">MEET THE ORGANIZER</span>
                <h3>
                  {c.organizerName}: a little courage,
                  <br />a community of possibility.
                </h3>
                <span className="text-link">
                  Read their story <ArrowUpRight size={18} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {content.testimonials.length > 0 && (
        <section className="testimonials container section">
          <SectionHeading
            eyebrow="KIND WORDS. SHARED PURPOSE."
            title="This is what together feels like."
          />
          <div className="three-grid">
            {content.testimonials.map((t) => (
              <blockquote key={t.name}>
                <Quote size={26} />
                <p>“{t.quote}”</p>
                <div className="organizer">
                  <span className="avatar">{t.name[0]}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <br />
                    <span className="small muted">{t.detail}</span>
                  </div>
                </div>
              </blockquote>
            ))}
          </div>
        </section>
      )}
      {content.partners.length > 0 && (
        <section className="partners container">
          <p className="eyebrow">IMAGINING A BETTER WORLD, TOGETHER</p>
          <div>
            {content.partners.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
          {demoMode && <p className="small muted">Demonstration supporter names</p>}
        </section>
      )}
      <section className="volunteer-cta container">
        <span className="giant-heart" aria-hidden="true">
          ♡
        </span>
        <div>
          <Eyebrow>YOU HAVE SOMETHING GOOD TO GIVE</Eyebrow>
          <h2>
            Sometimes, the most valuable
            <br />
            thing you can give is you.
          </h2>
          <p>Bring your time, your skills, and your whole heart.</p>
          <ButtonLink href="/volunteer">
            Find your place <ArrowUpRight size={18} />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
