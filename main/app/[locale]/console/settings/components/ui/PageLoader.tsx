'use client';

import BarLoader from 'react-spinners/BarLoader';

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <BarLoader
        color="#111827"
        width={180}
        height={3}
        speedMultiplier={0.8}
      />
      <p className="text-xs text-gray-400 tracking-wide">Loading settings…</p>
    </div>
  );
}