'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth';
import {
  removeShowcaseItem,
  reorderShowcaseItem,
  saveHomepageContent,
  savePartner,
  savePlatformSettings,
  saveTestimonial,
} from '../content';
import {
  homepageContentSchema,
  partnerSchema,
  platformSettingsSchema,
  testimonialSchema,
} from '../schemas';
import { invalidateCache } from '../cache';
import { type ActionState, boolField, field, success, toActionError } from '../action-result';

const numbers = (value: string) =>
  value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

/** Parses the repeated `question[]` / `answer[]` inputs into FAQ entries. */
function pairs(form: FormData, a: string, b: string) {
  const first = form.getAll(a).map(String);
  const second = form.getAll(b).map(String);
  return first
    .map((value, index) => ({ [a]: value.trim(), [b]: (second[index] || '').trim() }))
    .filter((entry) => entry[a] && entry[b]);
}

export async function saveHomepageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = homepageContentSchema.parse({
      announcement: field(form, 'announcement'),
      heroTitle: field(form, 'heroTitle'),
      heroSubtitle: field(form, 'heroSubtitle'),
      mission: field(form, 'mission'),
      impact: {
        people: field(form, 'people'),
        countries: field(form, 'countries'),
        projects: field(form, 'projects'),
      },
      donationImpacts: pairs(form, 'amount', 'label').map((entry) => ({
        amount: entry.amount,
        label: entry.label,
      })),
      featuredCampaignIds: form
        .getAll('featuredCampaignIds')
        .map((value) => String(value).trim())
        .filter(Boolean),
      faqs: pairs(form, 'question', 'answer'),
    });
    await saveHomepageContent(actor, input);
    revalidatePath('/admin/content');
    revalidatePath('/');
    return success('Homepage content saved.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = platformSettingsSchema.parse({
      general: {
        organizationName: field(form, 'organizationName'),
        websiteName: field(form, 'websiteName'),
        supportEmail: field(form, 'supportEmail'),
        defaultCurrency: field(form, 'defaultCurrency'),
        timezone: field(form, 'timezone'),
      },
      donations: {
        minimumDonation: field(form, 'minimumDonation'),
        suggestedAmounts: numbers(field(form, 'suggestedAmounts')),
        recurringEnabled: boolField(form, 'recurringEnabled'),
        anonymousAllowed: boolField(form, 'anonymousAllowed'),
      },
      campaigns: {
        requireApproval: boolField(form, 'requireApproval'),
        defaultDurationDays: field(form, 'defaultDurationDays'),
        allowComments: boolField(form, 'allowComments'),
        allowUpdates: boolField(form, 'allowUpdates'),
      },
      fees: {
        percentage: field(form, 'percentage'),
        fixed: field(form, 'fixed'),
        displayFees: boolField(form, 'displayFees'),
      },
      social: {
        facebook: field(form, 'facebook'),
        instagram: field(form, 'instagram'),
        x: field(form, 'x'),
        linkedin: field(form, 'linkedin'),
        youtube: field(form, 'youtube'),
      },
    });
    await savePlatformSettings(actor, input);
    invalidateCache();
    revalidatePath('/admin/settings');
    return success('Settings saved.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveTestimonialAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = testimonialSchema.parse({
      id: field(form, 'id') || undefined,
      name: field(form, 'name'),
      role: field(form, 'role'),
      quote: field(form, 'quote'),
      photo: field(form, 'photo'),
      published: boolField(form, 'published'),
      order: field(form, 'order') || 0,
    });
    await saveTestimonial(actor, input);
    revalidatePath('/admin/testimonials');
    revalidatePath('/');
    return success('Testimonial saved.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function savePartnerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = partnerSchema.parse({
      id: field(form, 'id') || undefined,
      name: field(form, 'name'),
      logo: field(form, 'logo'),
      website: field(form, 'website'),
      published: boolField(form, 'published'),
      order: field(form, 'order') || 0,
    });
    await savePartner(actor, input);
    revalidatePath('/admin/partners');
    revalidatePath('/');
    return success('Partner saved.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function showcaseItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const collection = field(form, 'collection') === 'partners' ? 'partners' : 'testimonials';
    const id = field(form, 'id');
    const action = field(form, 'action');
    if (action === 'delete') await removeShowcaseItem(actor, collection, id);
    else await reorderShowcaseItem(actor, collection, id, action === 'up' ? 'up' : 'down');
    revalidatePath(`/admin/${collection}`);
    revalidatePath('/');
    return success(action === 'delete' ? 'Entry deleted.' : 'Display order updated.');
  } catch (error) {
    return toActionError(error);
  }
}
