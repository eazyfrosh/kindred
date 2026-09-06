import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Create your account', robots: { index: false, follow: false } };
export default function Signup() {
  return <AuthForm mode="signup" />;
}
