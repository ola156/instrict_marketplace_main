import CommunityFeed from '@/components/feed/CommunityFeed';

import { Suspense } from 'react';

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityFeed authorType="rider" />
    </Suspense>
  );
}