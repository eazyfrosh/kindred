'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestJSON } from './forms';
export function AnimatedNumber({ value, currency = false }: { value: number; currency?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const animate = (now: number) => {
        const fraction = Math.min(1, (now - start) / 1000);
        setDisplay(Math.round(value * (1 - Math.pow(1 - fraction, 3))));
        if (fraction < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <span ref={ref} aria-label={`${currency ? 'USD ' : ''}${value}`}>
      <span aria-hidden="true">
        {currency ? '$' : ''}
        {display.toLocaleString()}
      </span>
    </span>
  );
}
export function CampaignView({ id }: { id: string }) {
  useEffect(() => {
    const key = `kindred-view:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    void requestJSON(`/api/campaigns/${id}/view`, {}).catch(() => {});
  }, [id]);
  return null;
}
interface ModelTool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
}
export function DiscoveryTools() {
  const router = useRouter();
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: ModelTool, options: { signal: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const abort = new AbortController();
    try {
      void Promise.resolve(
        ctx.registerTool(
          {
            name: 'navigate_campaign_search',
            description:
              'Open the campaign directory using the same keyword and category controls as the visible search form.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', maxLength: 100 },
                category: { type: 'string', maxLength: 100 },
              },
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute(input) {
              if (!input || typeof input !== 'object') throw new Error('Expected search input.');
              const data = input as Record<string, unknown>;
              for (const key of Object.keys(data))
                if (
                  !['query', 'category'].includes(key) ||
                  typeof data[key] !== 'string' ||
                  String(data[key]).length > 100
                )
                  throw new Error('Invalid search input.');
              const params = new URLSearchParams();
              if (data.query) params.set('q', String(data.query));
              if (data.category) params.set('category', String(data.category));
              router.push(`/causes?${params}`);
              return { navigatingTo: `/causes?${params}` };
            },
          },
          { signal: abort.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => abort.abort();
  }, [router]);
  return null;
}
