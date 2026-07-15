import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthScreen } from '@/components/AuthScreen';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');
  return <AuthScreen mode="login" enableGoogle={!!process.env.AUTH_GOOGLE_ID} />;
}
