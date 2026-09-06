'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { categories, type Campaign } from '@/types';
import { campaignSchema } from '@/lib/validation';
import { requestJSON } from './forms';
import { uploadImage } from '@/services/storage';
export function CampaignWizard({ initial }: { initial?: Campaign }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [data, setData] = useState({
    title: initial?.title || '',
    category: initial?.category || 'Education',
    shortDescription: initial?.shortDescription || '',
    goalAmount: initial?.goalAmount || 5000,
    currency: initial?.currency || 'USD',
    endDate: initial?.endDate.slice(0, 10) || '',
    description: initial?.description || '',
    coverImage: initial?.coverImage || '',
    gallery: initial?.gallery || ([] as string[]),
    organizerName: initial?.organizerName || '',
    organizerBio: initial?.organizerBio || '',
    location: initial?.location || '',
    allocation: initial?.allocation || [
      { label: 'Project delivery', percent: 85 },
      { label: 'Coordination & reporting', percent: 15 },
    ],
  });
  function field(name: keyof typeof data, value: unknown) {
    setData((d) => ({ ...d, [name]: value }));
  }
  async function images(files: FileList | null, cover: boolean) {
    if (!files?.length) return;
    setBusy(true);
    try {
      if (!cover && files.length + data.gallery.length > 8)
        throw new Error('Use up to 8 gallery images.');
      const urls = await Promise.all(Array.from(files).map((f) => uploadImage(f)));
      if (cover) field('coverImage', urls[0]);
      else field('gallery', [...data.gallery, ...urls]);
      toast.success('Images uploaded.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function next(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 5) {
      if (step === 3 && !data.coverImage) {
        toast.error('Please upload a cover image.');
        return;
      }
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const parsed = campaignSchema.parse(data);
      await requestJSON(
        initial ? `/api/campaigns/${initial.id}` : '/api/campaigns',
        parsed,
        initial ? 'PATCH' : 'POST',
      );
      toast.success('Campaign submitted for review.');
      router.push('/dashboard?tab=campaigns');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wizard">
      <div className="step-indicator">
        {['Details', 'Goal', 'Story', 'Media', 'Organizer', 'Review'].map((s, i) => (
          <span className={i <= step ? 'active' : ''} key={s}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <form className="panel" onSubmit={next}>
        <h2>
          {
            [
              'Start with the essentials.',
              'Give your goal a shape.',
              'Tell the story only you can.',
              'Bring your cause into focus.',
              'Introduce the person behind it.',
              'Ready to start something good?',
            ][step]
          }
        </h2>
        <div className="form-grid">
          {step === 0 && (
            <>
              <label className="full">
                Campaign title
                <input
                  required
                  maxLength={120}
                  value={data.title}
                  onChange={(e) => field('title', e.target.value)}
                />
              </label>
              <label className="full">
                Category
                <select value={data.category} onChange={(e) => field('category', e.target.value)}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="full">
                Short description
                <textarea
                  required
                  maxLength={240}
                  rows={3}
                  value={data.shortDescription}
                  onChange={(e) => field('shortDescription', e.target.value)}
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label>
                Fundraising target
                <input
                  type="number"
                  required
                  min={1}
                  max={10000000}
                  step="0.01"
                  value={data.goalAmount}
                  onChange={(e) => field('goalAmount', Number(e.target.value))}
                />
              </label>
              <label>
                Currency
                <select value={data.currency} onChange={(e) => field('currency', e.target.value)}>
                  {['USD', 'NGN', 'GBP', 'EUR'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="full">
                Campaign deadline
                <input
                  type="date"
                  required
                  value={data.endDate}
                  onChange={(e) => field('endDate', e.target.value)}
                />
              </label>
              <div className="full">
                <h3>Fund allocation</h3>
                <p className="small">Explain how funds will be used. Percentages must total 100.</p>
                {data.allocation.map((a, i) => (
                  <div className="form-grid mb-3" key={i}>
                    <label>
                      Purpose
                      <input
                        required
                        value={a.label}
                        onChange={(e) =>
                          field(
                            'allocation',
                            data.allocation.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Percentage
                      <input
                        type="number"
                        required
                        min={0}
                        max={100}
                        value={a.percent}
                        onChange={(e) =>
                          field(
                            'allocation',
                            data.allocation.map((x, j) =>
                              j === i ? { ...x, percent: Number(e.target.value) } : x,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="full">
                Use Markdown for rich text: ## headings, **bold**, and - lists. HTML is not
                accepted.
              </p>
              <label className="full">
                Your campaign story
                <textarea
                  required
                  maxLength={30000}
                  className="markdown-editor"
                  value={data.description}
                  onChange={(e) => field('description', e.target.value)}
                />
              </label>
              <button
                className="button secondary"
                type="button"
                onClick={() => setPreview(!preview)}
              >
                {preview ? 'Hide preview' : 'Preview formatting'}
              </button>
              {preview && (
                <div className="prose full">
                  <ReactMarkdown>{data.description}</ReactMarkdown>
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <label className="full">
                Cover image · JPG, PNG, or WebP, up to 5 MB
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => images(e.target.files, true)}
                />
              </label>
              {data.coverImage && <p className="notice success full">Cover image uploaded.</p>}
              <label className="full">
                Gallery images · up to 8
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={busy}
                  onChange={(e) => images(e.target.files, false)}
                />
              </label>
              <p className="full small">
                {data.gallery.length} gallery images uploaded. Only upload images you have
                permission to share.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <label className="full">
                Organizer name
                <input
                  required
                  maxLength={120}
                  value={data.organizerName}
                  onChange={(e) => field('organizerName', e.target.value)}
                />
              </label>
              <label className="full">
                City and country
                <input
                  required
                  maxLength={120}
                  value={data.location}
                  onChange={(e) => field('location', e.target.value)}
                />
              </label>
              <label className="full">
                About the organizer
                <textarea
                  required
                  maxLength={1500}
                  rows={5}
                  value={data.organizerBio}
                  onChange={(e) => field('organizerBio', e.target.value)}
                />
              </label>
            </>
          )}
          {step === 5 && (
            <div className="full">
              <h3>{data.title}</h3>
              <p>{data.shortDescription}</p>
              <p>
                <strong>
                  {data.currency} {data.goalAmount.toLocaleString()}
                </strong>{' '}
                · {data.category} · Deadline {data.endDate}
              </p>
              <p>
                Organized by {data.organizerName} · {data.location}
              </p>
              <div className="prose">
                <ReactMarkdown>{data.description}</ReactMarkdown>
              </div>
              <div className="notice">
                Your campaign will be pending until an administrator approves it. Edits to eligible
                campaigns are reviewed again.
              </div>
              <label className="check-label">
                <input type="checkbox" required />I confirm these details are accurate and I have
                permission to publish this content.
              </label>
            </div>
          )}
        </div>
        <div className="wizard-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy || step === 0}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
          <button className="button" disabled={busy}>
            {busy ? 'Please wait…' : step === 5 ? 'Submit for review' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}
