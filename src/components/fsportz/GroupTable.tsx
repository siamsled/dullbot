import React from 'react';
import { Group } from '@/lib/fsportz';

export default function GroupTable({ group }: { group: Group }) {
  return (
    <div className="gt-wrap">
      <div className="gt-head">
        <span className="gt-name">{group.name}</span>
        <div className="gt-cols">
          <span>W</span>
          <span className="gt-hide-sm">D</span>
          <span className="gt-hide-sm">L</span>
          <span className="gt-hide-sm">GF</span>
          <span className="gt-hide-sm">GA</span>
          <span>GD</span>
          <span>PTS</span>
        </div>
      </div>
      <div className="gt-rows">
        {group.entries.map((entry, i) => (
          <div key={entry.team.name} className={`gt-row ${entry.advanced ? 'gt-adv' : ''}`}>
            <span className={`gt-rank ${i < 2 ? 'gt-rank-q' : 'gt-rank-dim'}`}>{i + 1}</span>
            <div className="gt-logo">
              {entry.team.logo
                ? <img src={entry.team.logo} alt="" />
                : <div className="gt-logo-ph" />}
            </div>
            <span className="gt-team-name">{entry.team.name}</span>
            {entry.advanced && <span className="gt-adv-badge">ADV</span>}
            <div className="gt-stats">
              <span>{entry.w}</span>
              <span className="gt-hide-sm">{entry.d}</span>
              <span className="gt-hide-sm">{entry.l}</span>
              <span className="gt-hide-sm gt-dim">{entry.gf}</span>
              <span className="gt-hide-sm gt-dim">{entry.ga}</span>
              <span className={Number(entry.gd) > 0 ? 'gt-pos' : Number(entry.gd) < 0 ? 'gt-neg' : 'gt-dim'}>{entry.gd}</span>
              <span className="gt-pts">{entry.pts}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
