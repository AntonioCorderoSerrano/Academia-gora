'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initCapacitor } from '@/lib/capacitor';

export default function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    initCapacitor(router).catch(() => {});
  }, [router]);

  return null;
}
