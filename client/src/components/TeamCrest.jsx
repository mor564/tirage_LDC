import React, { useState } from 'react';

const SIZES = {
  xs: 'h-5 w-5 text-[8px]',
  sm: 'h-7 w-7 text-[9px]',
  md: 'h-10 w-10 text-[11px]',
  lg: 'h-16 w-16 text-sm',
  xl: 'h-24 w-24 text-lg',
};

/** Deux lettres tirées du nom court, pour le monogramme de repli. */
function monogram(team) {
  const words = (team.shortName || team.name).split(/[\s/-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || '?').slice(0, 2).toUpperCase();
}

/**
 * Écusson du club, avec repli sur un monogramme lorsque l'image est absente du
 * cache ou ne se charge pas.
 */
const TeamCrest = ({ team, size = 'md', className = '' }) => {
  const [failed, setFailed] = useState(false);
  const dimensions = SIZES[size] || SIZES.md;

  if (!team.logo || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 font-bold tracking-tight text-white/70 ${dimensions} ${className}`}
        title={team.name}
        aria-label={team.name}
      >
        {monogram(team)}
      </span>
    );
  }

  return (
    <img
      src={team.logo}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain drop-shadow ${dimensions} ${className}`}
      title={team.name}
    />
  );
};

export default TeamCrest;
