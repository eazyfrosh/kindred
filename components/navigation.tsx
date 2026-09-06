'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Heart, Menu, X } from 'lucide-react';
import { brand } from '@/lib/brand';
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label={`${brand.name} home`}>
      <span className="logo-mark">
        <Heart size={24} fill="currentColor" />
      </span>
      {brand.name}
      <span className="logo-dot">®</span>
    </Link>
  );
}
export function Navigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = [
    ['/causes', 'Explore causes'],
    ['/how-it-works', 'How it works'],
    ['/about', 'Our story'],
    ['/impact', 'Our impact'],
  ];
  return (
    <header className="site-header">
      <div className="nav-wrap container">
        <Logo />
        <nav aria-label="Main navigation" className={open ? 'main-nav open' : 'main-nav'}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link className="mobile-login" href="/dashboard" onClick={() => setOpen(false)}>
            My account
          </Link>
        </nav>
        <div className="nav-actions">
          <Link href="/dashboard" className="login-link">
            Log in
          </Link>
          <Link className="button small-button" href="/causes">
            Make a difference <ArrowUpRight size={16} />
          </Link>
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
