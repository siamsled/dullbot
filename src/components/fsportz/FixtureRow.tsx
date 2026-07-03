import React from 'react';
import Link from 'next/link';
import LocalTime from '@/components/fsportz/LocalTime';
import { FusedMatch } from '@/lib/fsportz';

export default function FixtureRow({ match, streamId }: { match: FusedMatch; streamId: string | null }) {
  const isLive = match.status === 'in';
  const isPost = match.status === 'post';
  const isPre = match.status === 'pre';
  const linkId = streamId || match.id;
  const href = `/fsportz/match/${encodeURIComponent(linkId)}?date=${encodeURIComponent(match.date)}&status=${match.status}&name=${encodeURIComponent(match.team1.name + ' vs ' + match.team2.name)}`;

  const inner = (
    <div className={`fr-row ${isLive ? 'fr-live' : isPre ? 'fr-pre' : 'fr-post'} ${isLive || isPre ? 'fr-clickable' : ''}`}>
      {isLive && <div className="fr-live-bar" />}

      {/* Team 1 */}
      <div className="fr-team fr-team-l">
        <span className={`fr-name ${isPost ? 'fr-muted' : ''}`}>{match.team1.name}</span>
        {match.team1.logo && (
          <div className="fr-flag">
            <img src={match.team1.logo} alt="" />
          </div>
        )}
      </div>

      {/* Center */}
      <div className="fr-mid">
        {isPost || isLive ? (
          <div className="fr-score">
            <span className={isPost ? 'fr-score-muted' : ''}>{match.team1.score}</span>
            <span className="fr-score-sep">{isLive ? '●' : '–'}</span>
            <span className={isPost ? 'fr-score-muted' : ''}>{match.team2.score}</span>
          </div>
        ) : (
          <span className="fr-time"><LocalTime dateStr={match.date} format="time" /></span>
        )}
        {isLive && <div className="fr-live-label">LIVE</div>}
        {isPost && <div className="fr-post-label">{match.statusDetail}</div>}
      </div>

      {/* Team 2 */}
      <div className="fr-team fr-team-r">
        {match.team2.logo && (
          <div className="fr-flag">
            <img src={match.team2.logo} alt="" />
          </div>
        )}
        <span className={`fr-name ${isPost ? 'fr-muted' : ''}`}>{match.team2.name}</span>
        {isLive && <span className="fr-watch-pill">WATCH</span>}
      </div>
    </div>
  );

  return (isLive || isPre) ? <Link href={href}>{inner}</Link> : inner;
}
