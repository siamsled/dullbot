'use client';

import React, { useState, useEffect } from 'react';

export default function LocalTime({ dateStr, format }: { dateStr: string, format: 'time' | 'date' }) {
  const [local, setLocal] = useState('');

  useEffect(() => {
    const d = new Date(dateStr);
    if (format === 'time') {
      setLocal(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setLocal(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    }
  }, [dateStr, format]);

  // Initial server render placeholder (avoids hydration mismatch)
  if (!local) {
    const d = new Date(dateStr);
    return (
      <span className="opacity-50">
        {format === 'time'
          ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
          : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase()}
      </span>
    );
  }

  return <span>{format === 'date' ? local.toUpperCase() : local}</span>;
}
