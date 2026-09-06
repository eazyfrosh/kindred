import { ButtonLink } from '@/components/ui';
export default function NotFound() {
  return (
    <div className="container section">
      <div className="empty">
        <h1 className="text-4xl">This page has moved on.</h1>
        <p>The campaign may be unavailable, or the address may be incorrect.</p>
        <ButtonLink href="/causes" className="mt-6">
          Find a cause
        </ButtonLink>
      </div>
    </div>
  );
}
