'use client';

import { useEffect, useState } from 'react';

export function ErrorBoundarySmokeCrash() {
  const [shouldCrash, setShouldCrash] = useState(false);
  useEffect(() => setShouldCrash(true), []);
  if (shouldCrash) {
    throw new Error('Error boundary smoke test');
  }
  return null;
}
