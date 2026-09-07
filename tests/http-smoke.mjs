import assert from 'node:assert/strict';
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const paths = [
  '/',
  '/causes',
  '/causes?category=Education',
  '/causes?sort=urgent',
  '/about',
  '/how-it-works',
  '/impact',
  '/volunteer',
  '/contact',
  '/privacy',
  '/terms',
  '/login',
  '/signup',
  '/forgot-password',
  '/campaign/a-brighter-start-for-every-child',
  '/donate/demo-1',
  '/donation/success',
  '/robots.txt',
  '/sitemap.xml',
  '/icon.svg',
  '/images/hero.jpg',
];
for (const path of paths) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  await response.arrayBuffer();
}
for (const path of ['/admin', '/dashboard', '/start-a-fundraiser']) {
  const response = await fetch(base + path, { redirect: 'manual' });
  assert.ok([307, 308].includes(response.status), path);
  assert.ok(response.headers.get('location')?.includes('/login'), path);
}
const request = (path, origin) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: '{}',
  });
assert.equal((await request('/api/campaigns', 'https://untrusted.example')).status, 403);
assert.equal((await fetch(base + '/api/admin/search?q=test')).status, 401);
assert.equal((await request('/api/donations/initialize', base)).status, 503);
assert.equal((await request('/api/submissions/contact', base)).status, 503);
console.log(
  `${paths.length} public/static routes, 3 protected redirects, and 4 mutation guards passed.`,
);
