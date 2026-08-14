import React from 'react';

export interface PersonaMeta {
  avatarUrl?: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  gender: 'male' | 'female';
}

export const PERSONA_CONFIGS: Record<string, PersonaMeta> = {
  'shuvo': {
    avatarUrl: '/personas/shuvo.png',
    bgColor: '#38BDF8',
    textColor: '#FFFFFF',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    gender: 'male'
  },
  'mehnaz': {
    avatarUrl: '/personas/mehnaz.png',
    bgColor: '#F472B6',
    textColor: '#FFFFFF',
    borderColor: 'rgba(244, 114, 182, 0.4)',
    gender: 'female'
  },
  'jisan': {
    avatarUrl: '/personas/jisan.png',
    bgColor: '#F59E0B',
    textColor: '#FFFFFF',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    gender: 'male'
  },
  'tanim': {
    avatarUrl: '/personas/tanim.png',
    bgColor: '#14B8A6',
    textColor: '#FFFFFF',
    borderColor: 'rgba(20, 184, 166, 0.4)',
    gender: 'male'
  },
  'nila': {
    avatarUrl: '/personas/nila.png',
    bgColor: '#8B5CF6',
    textColor: '#FFFFFF',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    gender: 'female'
  },
  'sharmin': {
    avatarUrl: '/personas/sharmin.png',
    bgColor: '#FB923C',
    textColor: '#FFFFFF',
    borderColor: 'rgba(251, 146, 60, 0.4)',
    gender: 'female'
  },
  'rakib': {
    avatarUrl: '/personas/rakib.png',
    bgColor: '#3B82F6',
    textColor: '#FFFFFF',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    gender: 'male'
  },
  'rumi': {
    avatarUrl: '/personas/rumi.png',
    bgColor: '#F43F5E',
    textColor: '#FFFFFF',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    gender: 'female'
  },
  'imran': {
    avatarUrl: '/personas/imran.png',
    bgColor: '#10B981',
    textColor: '#FFFFFF',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gender: 'male'
  },
  'biplob': {
    avatarUrl: '/personas/biplob.png',
    bgColor: '#D97706',
    textColor: '#FFFFFF',
    borderColor: 'rgba(217, 119, 6, 0.4)',
    gender: 'male'
  }
};

export function getPersonaKey(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('shuvo')) return 'shuvo';
  if (n.includes('mehnaz')) return 'mehnaz';
  if (n.includes('jisan')) return 'jisan';
  if (n.includes('tanim')) return 'tanim';
  if (n.includes('nila')) return 'nila';
  if (n.includes('sharmin')) return 'sharmin';
  if (n.includes('rakib')) return 'rakib';
  if (n.includes('rumi')) return 'rumi';
  if (n.includes('imran')) return 'imran';
  if (n.includes('biplob')) return 'biplob';
  return 'shuvo';
}

export function PersonaAvatar({
  name,
  className = 'w-10 h-10',
  size = 'md'
}: {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const key = getPersonaKey(name);
  const config = PERSONA_CONFIGS[key] || PERSONA_CONFIGS['shuvo'];
  const [imgError, setImgError] = React.useState(false);

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : 'A';

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold shadow-xs border transition-transform duration-200 ${className}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor
      }}
    >
      {!imgError && config.avatarUrl ? (
        <img
          src={config.avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-sm font-bold tracking-tight select-none drop-shadow-xs">
          {initial}
        </span>
      )}
    </div>
  );
}
