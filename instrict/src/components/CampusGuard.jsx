// src/components/CampusGuard.jsx
'use client';
import { useCampusStore } from '@/store/useCampusStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function CampusGuard({ children }) {
  const campus = useCampusStore((state) => state.campus);
  const router = useRouter();

  useEffect(() => {
    if (!campus) {
      router.push('/'); // Send back to selection if no campus picked
    }
  }, [campus, router]);

  if (!campus) return null; // Or a loading spinner
  return <>{children}</>;
}