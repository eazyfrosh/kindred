export type PayoutStatus =
  'requested' | 'under_review' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled';
export type VolunteerStatus = 'new' | 'reviewing' | 'accepted' | 'rejected';
export type MessageStatus = 'unread' | 'read' | 'resolved';
export type DonationStatus = 'pending' | 'successful' | 'failed' | 'refunded' | 'disputed';
export interface PayoutStatusEvent {
  status: PayoutStatus;
  note: string;
  adminId: string;
  adminEmail: string;
  createdAt: string;
}
export interface Payout {
  id: string;
  campaignId: string;
  campaignTitle: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  /** Human-readable destination summary only — never full banking credentials. */
  destinationSummary: string;
  destinationRef: string;
  availableAtRequest: number;
  adminNotes: string;
  history: PayoutStatusEvent[];
  requestedAt: string;
  updatedAt: string;
  paidAt: string | null;
  processedBy: string | null;
  providerReference: string;
}
export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
export interface AdminNotification {
  id: string;
  type:
    | 'campaign_submitted'
    | 'high_value_donation'
    | 'payout_requested'
    | 'campaign_goal_reached'
    | 'volunteer_application'
    | 'contact_message';
  title: string;
  message: string;
  href: string;
  read: boolean;
  createdAt: string;
}
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  photo: string;
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
export interface Partner {
  id: string;
  name: string;
  logo: string;
  website: string;
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}
export interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  interest: string;
  skills: string;
  message: string;
  status: VolunteerStatus;
  notes: string;
  createdAt: string;
  updatedAt?: string;
}
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt?: string;
}
export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: string;
  consent: boolean;
  createdAt: string;
}
export interface PlatformSettings {
  general: {
    organizationName: string;
    websiteName: string;
    supportEmail: string;
    defaultCurrency: string;
    timezone: string;
  };
  donations: {
    minimumDonation: number;
    suggestedAmounts: number[];
    recurringEnabled: boolean;
    anonymousAllowed: boolean;
  };
  campaigns: {
    requireApproval: boolean;
    defaultDurationDays: number;
    allowComments: boolean;
    allowUpdates: boolean;
  };
  fees: { percentage: number; fixed: number; displayFees: boolean };
  social: { facebook: string; instagram: string; x: string; linkedin: string; youtube: string };
  updatedAt?: string;
  updatedBy?: string;
}
export interface AdminUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoURL: string;
  role: 'user' | 'fundraiser' | 'admin';
  verified: boolean;
  fundraiserVerified?: boolean;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  adminNotes?: string;
  campaignCount?: number;
  totalDonated?: number;
}

export interface CampaignUpdateEntry {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  image?: string;
  createdAt: string;
}
export interface CampaignComment {
  id: string;
  campaignId: string;
  authorId: string;
  authorName: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
