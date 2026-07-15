import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthScreen } from '@/components/AuthScreen';

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');
  return <AuthScreen mode="signup" enableGoogle={!!process.env.AUTH_GOOGLE_ID} />;
}
