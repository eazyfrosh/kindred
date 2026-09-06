'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { requestJSON } from './forms';
import type { Content } from '@/types';
export function ContentEditor({ content }: { content: Content }) {
  const [value, setValue] = useState(content);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  function patch<K extends keyof Content>(key: K, next: Content[K]) {
    setValue((v) => ({ ...v, [key]: next }));
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await requestJSON('/api/admin/content', value);
          toast.success('Website content saved.');
          router.refresh();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className="detail-section">
        <h2>Homepage announcement</h2>
        <label>
          Announcement
          <input
            maxLength={300}
            value={value.announcement}
            onChange={(e) => patch('announcement', e.target.value)}
          />
        </label>
      </section>
      <section className="detail-section">
        <h2>Reported community impact</h2>
        <p>
          Use verified program records for these figures. Donation totals are calculated
          automatically from payments.
        </p>
        <div className="form-grid">
          {(['people', 'countries', 'projects'] as const).map((key) => (
            <label key={key}>
              {
                {
                  people: 'People supported',
                  countries: 'Countries reached',
                  projects: 'Projects completed',
                }[key]
              }
              <input
                type="number"
                min={0}
                max={key === 'countries' ? 250 : undefined}
                required
                value={value.impact[key]}
                onChange={(e) =>
                  patch('impact', { ...value.impact, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className="detail-section">
        <h2>Testimonials</h2>
        {value.testimonials.map((t, i) => (
          <div className="record-card form-grid" key={i}>
            <label className="full">
              Quote
              <textarea
                required
                maxLength={1000}
                value={t.quote}
                onChange={(e) =>
                  patch(
                    'testimonials',
                    value.testimonials.map((x, j) =>
                      j === i ? { ...x, quote: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label>
              Name
              <input
                required
                maxLength={120}
                value={t.name}
                onChange={(e) =>
                  patch(
                    'testimonials',
                    value.testimonials.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <label>
              Role or context
              <input
                required
                maxLength={200}
                value={t.detail}
                onChange={(e) =>
                  patch(
                    'testimonials',
                    value.testimonials.map((x, j) =>
                      j === i ? { ...x, detail: e.target.value } : x,
                    ),
                  )
                }
              />
            </label>
            <button
              className="button secondary small-button"
              type="button"
              onClick={() =>
                patch(
                  'testimonials',
                  value.testimonials.filter((_, j) => j !== i),
                )
              }
            >
              Remove testimonial
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={value.testimonials.length >= 12}
          onClick={() =>
            patch('testimonials', [...value.testimonials, { quote: '', name: '', detail: '' }])
          }
        >
          Add testimonial
        </button>
      </section>
      <section className="detail-section">
        <h2>Frequently asked questions</h2>
        {value.faqs.map((f, i) => (
          <div className="record-card form-grid" key={i}>
            <label className="full">
              Question
              <input
                required
                maxLength={300}
                value={f.question}
                onChange={(e) =>
                  patch(
                    'faqs',
                    value.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)),
                  )
                }
              />
            </label>
            <label className="full">
              Answer
              <textarea
                required
                maxLength={3000}
                value={f.answer}
                onChange={(e) =>
                  patch(
                    'faqs',
                    value.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)),
                  )
                }
              />
            </label>
            <button
              className="button secondary small-button"
              type="button"
              onClick={() =>
                patch(
                  'faqs',
                  value.faqs.filter((_, j) => j !== i),
                )
              }
            >
              Remove question
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={value.faqs.length >= 30}
          onClick={() => patch('faqs', [...value.faqs, { question: '', answer: '' }])}
        >
          Add question
        </button>
      </section>
      <section className="detail-section">
        <h2>Partners & supporters</h2>
        {value.partners.map((p, i) => (
          <div className="form-grid mb-4" key={i}>
            <label>
              Supporter name
              <input
                required
                maxLength={100}
                value={p}
                onChange={(e) =>
                  patch(
                    'partners',
                    value.partners.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
            </label>
            <button
              className="button secondary small-button self-end justify-self-start"
              type="button"
              onClick={() =>
                patch(
                  'partners',
                  value.partners.filter((_, j) => j !== i),
                )
              }
            >
              Remove supporter
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={value.partners.length >= 20}
          onClick={() => patch('partners', [...value.partners, ''])}
        >
          Add supporter
        </button>
      </section>
      <section className="detail-section">
        <h2>Your team</h2>
        {value.team.map((t, i) => (
          <div className="record-card form-grid" key={i}>
            <label>
              Name
              <input
                required
                maxLength={120}
                value={t.name}
                onChange={(e) =>
                  patch(
                    'team',
                    value.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
            </label>
            <label>
              Role
              <input
                required
                maxLength={200}
                value={t.role}
                onChange={(e) =>
                  patch(
                    'team',
                    value.team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)),
                  )
                }
              />
            </label>
            <button
              className="button secondary small-button"
              type="button"
              onClick={() =>
                patch(
                  'team',
                  value.team.filter((_, j) => j !== i),
                )
              }
            >
              Remove team member
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={value.team.length >= 20}
          onClick={() => patch('team', [...value.team, { name: '', role: '' }])}
        >
          Add team member
        </button>
      </section>
      <button className="button mt-6" disabled={busy}>
        {busy ? 'Saving…' : 'Save website content'}
      </button>
    </form>
  );
}
