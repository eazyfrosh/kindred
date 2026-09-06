import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Reset password', robots: { index: false, follow: false } };
export default function Forgot() {
  return <AuthForm mode="forgot-password" />;
}
