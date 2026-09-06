import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Log in', robots: { index: false, follow: false } };
export default function Login() {
  return <AuthForm mode="login" />;
}
