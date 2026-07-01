import React from 'react';

export const metadata = {
  title: 'FSportz',
  description: 'A new project.',
};

export default function FSportzLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {children}
    </div>
  );
}
