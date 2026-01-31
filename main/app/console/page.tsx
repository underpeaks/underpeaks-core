'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/app/layout';
export default function ConsoleIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/dashboard');
  }, [router]);

  return null;
}
