import React from 'react';

export const metadata = {
  title: 'FSportz',
  description: 'A new project.',
};

import FootballCursor from '@/components/fsportz/FootballCursor';

export default function FSportzLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#060e07] text-white font-sans">
      <FootballCursor />
      {children}
    </div>
  );
}
