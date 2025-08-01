import { redirect } from 'next/navigation';
import { hasValidConfig } from './config';

export default function Home() {
  if (hasValidConfig()) {
    redirect('/signin'); // ✅ If config exists, go to signin
  }

  redirect('/installer'); // ❌ Otherwise go to installer
}
