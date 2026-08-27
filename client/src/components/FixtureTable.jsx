import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamCrest from './TeamCrest';
import { VenueTag } from './DrawComponent';
import { potStyle } from './potStyles';

/**
 * Tableau des affiches : pour chacune des 36 équipes, ses 8 adversaires
 * regroupés par chapeau, avec le lieu de la rencontre et la journée.
 * Filtres par chapeau et recherche par nom de club ou association.
 */
const FixtureTable = ({ fixtureTable }) => {
  const [potFilter, setPotFilter] = useState(0); // 0 = tous les chapeaux
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fixtureTable.filter(entry => {
      if (potFilter !== 0 && entry.team.pot !== potFilter) return false;
      if (!needle) return true;
      return (
        entry.team.name.toLowerCase().includes(needle) ||
        entry.team.country.toLowerCase().includes(needle)
      );
    });
  }, [fixtureTable, potFilter, query]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[0, 1, 2, 3, 4].map(pot => (
            <button
              key={pot}
              type="button"
              onClick={() => setPotFilter(pot)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                potFilter === pot
                  ? pot === 0
                    ? 'bg-uefa-gold font-semibold text-uefa-blue'
                    : `${potStyle(pot).chip} font-semibold`
                  : 'border border-white/20 text-white/70 hover:border-uefa-gold/60'
              }`}
            >
              {pot === 0 ? 'Tous' : `Chapeau ${pot}`}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Rechercher un club…"
          className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-uefa-gold/60 focus:outline-none sm:w-56"
        />
      </div>

      {rows.length === 0 && (
        <p className="py-12 text-sm text-white/50">Aucune équipe ne correspond à cette recherche.</p>
      )}

      <motion.div layout className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {rows.map(entry => (
            <motion.article
              key={entry.team.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              whileHover={{ y: -3 }}
              className={`overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] ring-1 ${potStyle(entry.team.pot).ring}`}
            >
              <header className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                <TeamCrest team={entry.team} size="md" />
                <div className="min-w-0 flex-1 text-left">
                  <h3 className="truncate font-bold text-white">{entry.team.name}</h3>
                  <p className="text-[11px] text-white/45">
                    {entry.team.country} · {potStyle(entry.team.pot).label}
                  </p>
                </div>
              </header>

              <ul className="divide-y divide-white/5">
                {entry.opponents.map(opponent => (
                  <li key={opponent.id} className="flex items-center gap-2.5 px-4 py-2 text-sm transition hover:bg-white/5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${potStyle(opponent.pot).dot}`} title={potStyle(opponent.pot).label} />
                    <TeamCrest team={opponent} size="xs" />
                    <span className="flex-1 truncate text-left">{opponent.shortName}</span>
                    <span className="shrink-0 text-[10px] text-white/35">{opponent.country}</span>
                    <VenueTag venue={opponent.venue} />
                    <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-white/35">
                      J{opponent.matchday}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FixtureTable;
