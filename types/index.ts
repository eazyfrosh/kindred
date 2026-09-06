export const categories = [
  'Children',
  'Education',
  'Healthcare',
  'Environment',
  'Food',
  'Disaster Relief',
  'Community',
  'Animals',
  'Emergency Support',
] as const;
export type Category = (typeof categories)[number];
export type Role = 'user' | 'fundraiser' | 'admin';
export type CampaignStatus =
  'draft' | 'pending' | 'approved' | 'rejected' | 'suspended' | 'completed';
export interface Campaign {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  category: Category;
  organizerId: string;
  organizerName: string;
  organizerBio: string;
  location: string;
  coverImage: string;
  gallery: string[];
  goalAmount: number;
  amountRaised: number;
  currency: string;
  donorCount: number;
  viewCount: number;
  shareCount: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  featured: boolean;
  verified: boolean;
  urgent: boolean;
  createdAt: string;
  updatedAt: string;
  allocation: { label: string; percent: number }[];
  searchTokens: string[];
  closureRequested?: boolean;
}
export interface Donation {
  id: string;
  campaignId: string;
  campaignTitle: string;
  donorId: string | null;
  donorName: string;
  donorEmail: string;
  amount: number;
  currency: string;
  anonymous: boolean;
  message: string;
  paymentProvider: string;
  paymentReference: string;
  paymentStatus: 'pending' | 'successful' | 'failed' | 'refunded';
  frequency: 'once' | 'monthly';
  createdAt: string;
  receiptToken?: string;
  providerTransactionId?: string;
  refundedMinor?: number;
}
export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoURL: string;
  role: Role;
  verified: boolean;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  savedCampaigns: string[];
}
export interface Content {
  announcement: string;
  impact: { people: number; countries: number; projects: number };
  testimonials: { quote: string; name: string; detail: string }[];
  partners: string[];
  faqs: { question: string; answer: string }[];
  team: { name: string; role: string }[];
}
