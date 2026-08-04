import CommunityFeed from '@/components/feed/CommunityFeed'; // wherever you put the new file
import { Suspense } from 'react';

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityFeed authorType="student" />
    </Suspense>
  );
}