import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowUpRight, Heart, ShieldCheck, Sprout } from 'lucide-react';
import { PageHero, ButtonLink, SectionHeading } from '@/components/ui';
import { SubmissionForm } from '@/components/forms';
import { getContent, impactStats } from '@/services/campaigns';
import { photos } from '@/lib/demo';
import { money } from '@/lib/brand';
const titles: Record<string, string> = {
  about: 'Good begins with people.',
  'how-it-works': 'A little help. A clear path.',
  impact: 'Together, we move things forward.',
  volunteer: 'Give your time. Grow something good.',
  contact: 'A conversation can start something.',
  privacy: 'Your privacy matters.',
  terms: 'Our community commitments.',
};
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return { title: titles[page] || 'Not found', alternates: { canonical: `/${page}` } };
}
export default async function PublicPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!titles[page]) notFound();
  const content = await getContent();
  return (
    <>
      <PageHero
        eyebrow={
          {
            about: 'OUR STORY',
            'how-it-works': 'HOW KINDRED WORKS',
            impact: 'OUR SHARED IMPACT',
            volunteer: 'SHOW UP FOR SOMEONE',
            contact: 'WE’RE HERE TO HELP',
            privacy: 'TRUST & TRANSPARENCY',
            terms: 'TRUST & TRANSPARENCY',
          }[page] || ''
        }
        title={titles[page]}
      >
        {page === 'about'
          ? 'We connect everyday generosity with community-led ideas for a better tomorrow.'
          : page === 'volunteer'
            ? 'Your time, perspective, and skills can make a difference. Tell us a little about yourself.'
            : page === 'contact'
              ? 'Have a question, an idea, or a story to share? Our team would love to hear from you.'
              : page === 'impact'
                ? 'Every contribution belongs to a bigger story. Here is the progress our community is making.'
                : null}
      </PageHero>
      <div className="container pb-20">
        {page === 'about' && (
          <>
            <div className="mission-section pb-16">
              <div className="mission-photo">
                <Image src={photos.trees} alt="People planting a tree together" fill sizes="50vw" />
              </div>
              <div className="prose">
                <h2>
                  Hope becomes real
                  <br />
                  when people act.
                </h2>
                <p>
                  Kindred began with a simple question: what if it were easier to help the people
                  building a better world around us?
                </p>
                <h3>Our mission</h3>
                <p>
                  Make thoughtful giving accessible, and help community organizers turn local
                  knowledge into lasting improvements.
                </p>
                <h3>Our vision</h3>
                <p>
                  A world where the resources to do good are within reach of the people closest to
                  the need.
                </p>
              </div>
            </div>
            <SectionHeading title="What we stand for." />
            <div className="three-grid mb-16">
              {[
                [
                  Heart,
                  'People first',
                  'Listen to communities. Respect their dignity, expertise, and choices.',
                ],
                [
                  ShieldCheck,
                  'Trust, earned',
                  'Review campaigns, protect donations, and make progress visible.',
                ],
                [
                  Sprout,
                  'Lasting possibility',
                  'Support practical ideas that continue to matter after a campaign ends.',
                ],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Heart;
                return (
                  <div className="panel" key={String(t)}>
                    <Icon className="mb-5 text-brand" />
                    <h3>{String(t)}</h3>
                    <p>{String(d)}</p>
                  </div>
                );
              })}
            </div>
            {content.team.length > 0 && (
              <>
                <SectionHeading title="People behind the purpose." />
                <div className="three-grid mb-16">
                  {content.team.map((t) => (
                    <div className="panel" key={t.name}>
                      <span className="avatar mb-4">{t.name[0]}</span>
                      <h3>{t.name}</h3>
                      <p>{t.role}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            <section id="transparency" className="panel prose">
              <h2>Trust is built in the open.</h2>
              <p>
                Every submitted campaign is reviewed before it becomes public. Organizers publish
                their spending plans, and donors can follow updates and access payment receipts from
                their accounts.
              </p>
              <p>
                Approval confirms a platform review. It does not guarantee delivery, and it does not
                establish tax deductibility. Read the campaign story and allocation before giving.
              </p>
              <ButtonLink href="/contact" secondary>
                Ask us about our process <ArrowUpRight size={16} />
              </ButtonLink>
            </section>
          </>
        )}
        {page === 'how-it-works' && (
          <>
            <div className="three-grid mb-16">
              {[
                [
                  'For donors',
                  'Find a cause you connect with. Choose an amount and complete hosted checkout. Keep your receipt and follow campaign updates.',
                  'Explore causes',
                  '/causes',
                ],
                [
                  'For fundraisers',
                  'Create your account and verify your email. Share your story, goal, and spending plan. Submit for review, then invite your community to give.',
                  'Start a fundraiser',
                  '/start-a-fundraiser',
                ],
                [
                  'For organizations',
                  'Tell us about your organization and the communities you serve. Our team can help you understand the review and reporting process.',
                  'Talk to our team',
                  '/contact',
                ],
              ].map(([title, copy, cta, href]) => (
                <div className="panel" key={title}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <ButtonLink href={href} secondary>
                    {cta}
                  </ButtonLink>
                </div>
              ))}
            </div>
            <section id="faq" className="narrow">
              <SectionHeading title="Good questions. Clear answers." />
              {content.faqs.map((f) => (
                <details className="faq" key={f.question}>
                  <summary>{f.question}</summary>
                  <p>{f.answer}</p>
                </details>
              ))}
            </section>
          </>
        )}
        {page === 'impact' && <Impact />}
        {(page === 'volunteer' || page === 'contact') && (
          <div className="form-layout">
            <div>
              <h2>{page === 'volunteer' ? 'Bring what makes you, you.' : 'Let’s talk.'}</h2>
              <p>
                {page === 'volunteer'
                  ? 'From local outreach to digital skills, there are many ways to be useful. We review each application and connect people with suitable opportunities.'
                  : 'For questions about a donation, include the transaction reference, but never include payment credentials or card information.'}
              </p>
              <div className="notice">
                {page === 'volunteer'
                  ? 'You do not need to be an expert. A willingness to listen and help is a good place to start.'
                  : 'Already part of Kindred? You can find your receipts and campaign information in your account.'}
              </div>
              <ButtonLink href={page === 'volunteer' ? '/how-it-works' : '/dashboard'} secondary>
                {page === 'volunteer' ? 'See how it works' : 'Go to your account'}
              </ButtonLink>
            </div>
            <div className="panel">
              <SubmissionForm kind={page as 'volunteer' | 'contact'} />
            </div>
          </div>
        )}
        {page === 'privacy' && (
          <div className="prose narrow">
            <div className="notice">
              Deployment policy template: the operating organization must replace this notice with
              its reviewed privacy policy before launch.
            </div>
            <h2>Information we collect</h2>
            <p>
              Account details, campaign submissions, messages, volunteer applications, and donation
              records are stored to operate this platform. Payment providers handle payment
              credentials directly.
            </p>
            <h2>Your choices</h2>
            <p>
              You can give anonymously in public donor lists. Platform administrators still retain
              donation information needed for accounting and support. You can request access,
              correction, or deletion through the contact form.
            </p>
            <h2>Service providers and retention</h2>
            <p>
              Firebase provides authentication and storage. The selected payment provider processes
              payments. The operating organization must publish its retention periods, legal basis,
              contact details, and relevant international transfer information before accepting live
              data.
            </p>
            <h2>Cookies</h2>
            <p>
              An essential secure session cookie keeps you signed in. This application does not
              include advertising trackers.
            </p>
          </div>
        )}
        {page === 'terms' && (
          <div className="prose narrow">
            <div className="notice">
              Deployment policy template: finalize the organization’s terms, refund policy,
              jurisdiction, and charitable disclosures before launch.
            </div>
            <h2>A community built on trust</h2>
            <p>
              Organizers must provide accurate information, have permission to share all media, and
              use funds for the stated purpose. The platform may reject or suspend campaigns that do
              not meet its requirements.
            </p>
            <h2>Giving and receipts</h2>
            <p>
              Donations are processed by the selected payment provider. A transaction receipt
              confirms payment and is not a guarantee of tax deductibility. Contact the operating
              organization for refund requests, quoting your transaction reference.
            </p>
            <h2>Monthly support</h2>
            <p>
              Monthly gifts continue until canceled. Signed-in donors can access the payment
              provider’s subscription portal from their dashboard.
            </p>
            <h2>Account responsibility</h2>
            <p>
              Keep your account secure. Do not submit false campaigns, publish private information
              without consent, or attempt to manipulate payment records.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
async function Impact() {
  const s = await impactStats();
  return (
    <>
      <div className="metric-grid">
        {[
          ['Raised in USD', money(s.raised)],
          ['Projects completed', s.projects],
          ['Active causes', s.active],
          ['Countries reached', s.countries],
          ['People supported', s.people],
          ['Acts of giving', s.donors],
        ].map(([t, n]) => (
          <div className="metric" key={t}>
            <span>{t}</span>
            <strong>{typeof n === 'number' ? n.toLocaleString() : n}</strong>
          </div>
        ))}
      </div>
      <div className="panel mb-10">
        <h2>People and places at the heart of it.</h2>
        <p>
          Community outcomes reported by the platform team. Donation totals are updated from
          confirmed payments; currencies are tracked separately without an assumed exchange rate.
        </p>
        <div
          className="bar-chart"
          role="img"
          aria-label={`${s.projects} projects, ${s.countries} countries, ${s.active} active causes`}
        >
          {[
            ['Projects', s.projects],
            ['Countries', s.countries],
            ['Active causes', s.active],
          ].map(([label, value]) => (
            <div className="bar-column" key={label}>
              <strong>{value}</strong>
              <div
                className="bar"
                style={{
                  height: `${Math.max(2, (Number(value) / Math.max(s.projects, s.countries, s.active, 1)) * 130)}px`,
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <ButtonLink href="/causes">
        Be part of what comes next <ArrowUpRight size={18} />
      </ButtonLink>
    </>
  );
}
