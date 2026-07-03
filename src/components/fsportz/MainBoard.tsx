'use client';
import React, { useState, useRef, useEffect } from 'react';
import FixtureRow from '@/components/fsportz/FixtureRow';
import GroupTable from '@/components/fsportz/GroupTable';
import LocalTime from '@/components/fsportz/LocalTime';
import { FusedMatch, Group } from '@/lib/fsportz';

export default function MainBoard({
  upcomingDates,
  pastDates,
  fixturesByDate,
  groups
}: {
  upcomingDates: string[];
  pastDates: string[];
  fixturesByDate: Record<string, FusedMatch[]>;
  groups: Group[];
}) {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings'>('fixtures');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fixturesBtnRef = useRef<HTMLButtonElement>(null);
  const standingsBtnRef = useRef<HTMLButtonElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ left: 6, width: 0 });

  useEffect(() => {
    const updateSlider = () => {
      const activeBtn = activeTab === 'fixtures' ? fixturesBtnRef.current : standingsBtnRef.current;
      const container = containerRef.current;
      if (activeBtn && container) {
        setSliderStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
        });
      }
    };
    
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [activeTab]);

  return (
    <div className="fs-main-board">
      <style jsx>{`
        .fs-main-board { margin-top: 40px; }
        .fs-toggle-wrapper {
          display: flex; justify-content: center; margin-bottom: 40px;
        }
        .fs-3d-toggle {
          display: inline-flex;
          background: #0d130f;
          padding: 6px;
          border-radius: 99px;
          box-shadow: inset 0 4px 10px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }
        .fs-toggle-btn {
          position: relative; z-index: 2;
          padding: 12px 32px;
          font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.5);
          background: transparent;
          border: none; cursor: pointer;
          transition: color 0.3s;
          border-radius: 99px;
          white-space: nowrap;
        }
        .fs-toggle-btn.active { color: #000; }
        
        .fs-toggle-slider {
          position: absolute; top: 6px; bottom: 6px;
          background: linear-gradient(145deg, #ffffff, #d1d1d1);
          border-radius: 99px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4), inset 0 -2px 5px rgba(0,0,0,0.1), inset 0 2px 4px #fff;
          transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 1;
        }
        
        @media (max-width: 640px) {
           .fs-toggle-btn { padding: 10px 20px; font-size: 12px; }
        }
        /* ===== BOARDS ===== */
        .fs-board-content {
          background: #0d130f;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 24px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="fs-toggle-wrapper">
        <div className="fs-3d-toggle" ref={containerRef}>
          <div className="fs-toggle-slider" style={{ left: sliderStyle.left, width: sliderStyle.width }} />
          <button 
            ref={fixturesBtnRef}
            className={`fs-toggle-btn ${activeTab === 'fixtures' ? 'active' : ''}`}
            onClick={() => setActiveTab('fixtures')}
          >
            All Fixtures
          </button>
          <button 
            ref={standingsBtnRef}
            className={`fs-toggle-btn ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            Group Standings
          </button>
        </div>
      </div>

      <div className="fs-board-content">
        {activeTab === 'fixtures' ? (
          <section className="fs-section">
            {upcomingDates.map(dk => {
              const matches = fixturesByDate[dk];
              const hasLive = matches.some(m => m.status === 'in');
              return (
                <div key={dk} className="fg-group">
                  <div className="fg-date-row">
                    <span className={`fg-date-pill ${hasLive ? 'fg-date-pill-live' : 'fg-date-pill-upcoming'}`}>
                      <LocalTime dateStr={matches[0].date} format="date" />
                    </span>
                    <div className="fg-line" />
                  </div>
                  <div className="fg-rows">
                    {matches.map(m => <FixtureRow key={m.id} match={m} streamId={m.stremioId} />)}
                  </div>
                </div>
              );
            })}

            {pastDates.length > 0 && (
              <>
                <div className="fg-completed-head">
                  <span className="fg-completed-label">Completed</span>
                  <div className="fg-completed-line" />
                </div>
                {[...pastDates].reverse().map(dk => (
                  <div key={dk} className="fg-group">
                    <div className="fg-date-row">
                      <span className="fg-date-pill fg-date-pill-past">
                        <LocalTime dateStr={fixturesByDate[dk][0].date} format="date" />
                      </span>
                      <div className="fg-line" />
                    </div>
                    <div className="fg-rows">
                      {fixturesByDate[dk].map(m => <FixtureRow key={m.id} match={m} streamId={m.stremioId} />)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        ) : (
          <div className="fs-groups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {groups.map(g => <GroupTable key={g.name} group={g} />)}
          </div>
        )}
      </div>
    </div>
  );
}
