'use client';
import { useState } from 'react';
import { Plus, Trash } from 'lucide-react';
import { BUTTON_SECONDARY, INPUT, LABEL } from './theme';

export interface RepeatableField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea';
  maxLength?: number;
  min?: number;
}

/**
 * Repeating form rows (FAQ entries, donation impact amounts).
 *
 * Each row submits its fields as repeated form values, which the server action
 * zips back into objects — so the whole set posts in one validated submission.
 */
export function RepeatableRows<T extends Record<string, string | number>>({
  legend,
  fields,
  initial,
  max = 12,
  addLabel = 'Add row',
}: {
  legend: string;
  fields: RepeatableField[];
  initial: T[];
  max?: number;
  addLabel?: string;
}) {
  const [rows, setRows] = useState<(T | Record<string, string>)[]>(
    initial.length ? initial : [Object.fromEntries(fields.map((field) => [field.name, '']))],
  );

  return (
    <fieldset className="space-y-2">
      <legend className={LABEL}>{legend}</legend>
      {rows.map((row, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {fields.map((field) =>
              field.type === 'textarea' ? (
                <textarea
                  key={field.name}
                  name={field.name}
                  rows={2}
                  maxLength={field.maxLength}
                  defaultValue={String(row[field.name] ?? '')}
                  placeholder={field.label}
                  aria-label={field.label}
                  className={INPUT}
                />
              ) : (
                <input
                  key={field.name}
                  name={field.name}
                  type={field.type === 'number' ? 'number' : 'text'}
                  min={field.min}
                  maxLength={field.maxLength}
                  defaultValue={String(row[field.name] ?? '')}
                  placeholder={field.label}
                  aria-label={field.label}
                  className={INPUT}
                />
              ),
            )}
          </div>
          <button
            type="button"
            aria-label={`Remove ${legend} row ${index + 1}`}
            onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            className="mt-1 rounded-md border border-[#fda29b] bg-white p-2 text-[#b42318] hover:bg-[#fef3f2]"
          >
            <Trash size={14} />
          </button>
        </div>
      ))}
      {rows.length < max && (
        <button
          type="button"
          onClick={() =>
            setRows((current) => [
              ...current,
              Object.fromEntries(fields.map((field) => [field.name, ''])),
            ])
          }
          className={BUTTON_SECONDARY}
        >
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </fieldset>
  );
}
