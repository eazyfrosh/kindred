'use client';
import { useState } from 'react';
import { Share2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { requestJSON } from './forms';
export function CampaignActions({ id, title }: { id: string; title: string }) {
  const [busy, setBusy] = useState(false);
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        toast.success('Campaign link copied.');
      }
      await requestJSON(`/api/campaigns/${id}/share`, {});
    } catch (e) {
      if ((e as Error).name !== 'AbortError')
        toast.info('Use the page address to share this campaign.');
    }
  }
  async function save() {
    setBusy(true);
    try {
      const data = await requestJSON('/api/account', { action: 'save', campaignId: id });
      toast.success(
        data.saved ? 'Campaign saved to your dashboard.' : 'Campaign removed from your saved list.',
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="button-row">
      <button className="button secondary" onClick={share}>
        <Share2 size={17} />
        Share this cause
      </button>
      <button className="button secondary" disabled={busy} onClick={save}>
        <Bookmark size={17} />
        Save
      </button>
    </div>
  );
}
export function CommentForm({ campaignId }: { campaignId: string }) {
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    try {
      await requestJSON(`/api/campaigns/${campaignId}/comments`, {
        message: new FormData(form).get('message'),
      });
      toast.success('Your message has been submitted for review.');
      form.reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-grid">
      <label className="full">
        Leave a little encouragement
        <textarea name="message" required maxLength={1000} rows={3} />
      </label>
      <button className="button secondary" disabled={busy}>
        Send support message
      </button>
      <p className="small muted full">
        Sign in to leave a message. Messages are reviewed before publication.
      </p>
    </form>
  );
}
