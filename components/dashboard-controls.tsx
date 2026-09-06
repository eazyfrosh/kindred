'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { requestJSON } from './forms';
import { uploadImage } from '@/services/storage';
import type { UserProfile } from '@/types';
export function ActionButton({
  url,
  data,
  children,
  confirm = false,
}: {
  url: string;
  data: unknown;
  children: React.ReactNode;
  confirm?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      className="button secondary small-button"
      onClick={async () => {
        if (
          confirm &&
          !window.confirm('Are you sure? This action will change or delete this record.')
        )
          return;
        setBusy(true);
        try {
          const result = await requestJSON(url, data);
          if (result.url) window.location.assign(result.url);
          else {
            toast.success('Updated successfully.');
            router.refresh();
          }
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Saving…' : children}
    </button>
  );
}
export function ProfileForm({ user }: { user: UserProfile }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await requestJSON('/api/account', {
            action: 'profile',
            ...Object.fromEntries(new FormData(e.currentTarget)),
          });
          toast.success('Profile updated.');
          router.refresh();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="full">
        Profile photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const photoURL = await uploadImage(file, 'profiles');
              await requestJSON('/api/account', { action: 'photo', photoURL });
              toast.success('Profile photo updated.');
              router.refresh();
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <label>
        First name
        <input name="firstName" required maxLength={80} defaultValue={user.firstName} />
      </label>
      <label>
        Last name
        <input name="lastName" required maxLength={80} defaultValue={user.lastName} />
      </label>
      <label className="full">
        Email address
        <input value={user.email} readOnly />
      </label>
      <button className="button" disabled={busy}>
        Save profile
      </button>
    </form>
  );
}
export function UpdateForm({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState('');
  const router = useRouter();
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        try {
          await requestJSON(`/api/campaigns/${id}/updates`, {
            ...Object.fromEntries(new FormData(form)),
            image,
          });
          toast.success('Campaign update published.');
          form.reset();
          setImage('');
          router.refresh();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="full">
        Update title
        <input name="title" required maxLength={140} />
      </label>
      <label className="full">
        What’s new? (Markdown supported)
        <textarea name="body" required maxLength={10000} rows={5} />
      </label>
      <label className="full">
        Optional image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              setImage(await uploadImage(file));
              toast.success('Image uploaded.');
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <button className="button" disabled={busy}>
        Publish update
      </button>
    </form>
  );
}
export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await requestJSON('/api/admin/volunteerApplications', {
            id,
            action: 'notes',
            notes: new FormData(e.currentTarget).get('notes'),
          });
          toast.success('Internal notes saved.');
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Internal notes
        <textarea name="notes" rows={2} defaultValue={notes} maxLength={5000} />
      </label>
      <button className="button secondary small-button mt-3" disabled={busy}>
        Save notes
      </button>
    </form>
  );
}
