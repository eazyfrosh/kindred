import Link from 'next/link';
import { ArrowUpRight, Heart } from 'lucide-react';
import { Logo } from './navigation';
import { SubmissionForm } from './forms';
export function Footer() {
  return (
    <footer>
      <div className="newsletter container">
        <div>
          <span className="eyebrow">A LITTLE GOOD IN YOUR INBOX</span>
          <h2>Stay close to the change.</h2>
          <p>Real stories. Meaningful progress. More reasons to hope.</p>
        </div>
        <SubmissionForm kind="newsletter" />
      </div>
      <div className="footer-main container">
        <div>
          <Logo />
          <p>
            Good happens when we come together.
            <br />
            Let’s build a kinder world, one act at a time.
          </p>
          <Link className="text-link" href="/start-a-fundraiser">
            Start something good <ArrowUpRight size={17} />
          </Link>
        </div>
        <div>
          <h4>Make a difference</h4>
          <Link href="/causes">Explore causes</Link>
          <Link href="/start-a-fundraiser">Start a fundraiser</Link>
          <Link href="/volunteer">Become a volunteer</Link>
        </div>
        <div>
          <h4>Get to know us</h4>
          <Link href="/about">Our story</Link>
          <Link href="/impact">Our impact</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>
          <h4>Here to help</h4>
          <Link href="/how-it-works#faq">Questions & answers</Link>
          <Link href="/dashboard">Your account</Link>
          <Link href="/about#transparency">Trust & transparency</Link>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} Kindred. Made for a little more good.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <span>
            Built around people <Heart size={13} />
          </span>
        </div>
      </div>
    </footer>
  );
}
