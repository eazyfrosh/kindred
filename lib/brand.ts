export const brand = {
  name: 'Kindred',
  tagline: 'Small acts. Lasting change.',
  email: 'hello@example.org',
  description: 'A community of people turning everyday generosity into lasting change.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 ? 2 : 0,
  }).format(amount);
export const percent = (raised: number, goal: number) =>
  goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
export const daysLeft = (date: string) =>
  Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
export const tokens = (text: string) =>
  [
    ...new Set(
      text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean),
    ),
  ].slice(0, 100);
