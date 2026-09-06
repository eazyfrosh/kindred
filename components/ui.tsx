import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Check, Heart, MapPin, Users } from 'lucide-react';
import type { Campaign } from '@/types';
import { daysLeft, money, percent } from '@/lib/brand';
export function ButtonLink({
  href,
  children,
  secondary = false,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link className={`button ${secondary ? 'secondary' : ''} ${className}`} href={href}>
      {children}
    </Link>
  );
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow">
      <span /> {children}
    </div>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  children,
  link,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  link?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {link && (
        <Link className="text-link" href={link}>
          Explore all causes <ArrowUpRight size={18} />
        </Link>
      )}
    </div>
  );
}
export function Progress({ raised, goal }: { raised: number; goal: number }) {
  const value = percent(raised, goal);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Campaign funding"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  return (
    <article className="campaign-card">
      <Link href={`/campaign/${c.slug}`} className="campaign-image">
        <Image
          src={c.coverImage}
          alt={`${c.category} community project — illustrative photograph`}
          fill
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
        <span className="category-pill">{c.category}</span>
        {c.urgent && <span className="urgent-pill">Urgent</span>}
      </Link>
      <div className="campaign-body">
        <div className="small muted location">
          <MapPin size={13} />
          {c.location}
        </div>
        <h3>
          <Link href={`/campaign/${c.slug}`}>{c.title}</Link>
        </h3>
        <p>{c.shortDescription}</p>
        <div className="organizer">
          <span className="avatar">{c.organizerName[0]}</span> by {c.organizerName}{' '}
          {c.verified && <Check size={14} className="verified" aria-label="Reviewed campaign" />}
        </div>
        <Progress raised={c.amountRaised} goal={c.goalAmount} />
        <div className="funding">
          <strong>
            {money(c.amountRaised, c.currency)} <span>raised</span>
          </strong>
          <span>{percent(c.amountRaised, c.goalAmount)}%</span>
        </div>
        <div className="card-bottom">
          <span>
            <Users size={14} /> {c.donorCount} donors · {daysLeft(c.endDate)} days left
          </span>
          <Link href={`/donate/${c.id}`} aria-label={`Donate to ${c.title}`}>
            <Heart size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-hero container">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      <div className="lede">{children}</div>
    </section>
  );
}
export function Empty({
  title = 'Nothing here just yet.',
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Heart size={30} />
      <h3>{title}</h3>
      <p>{children || 'Check back soon for new stories and opportunities to help.'}</p>
    </div>
  );
}
