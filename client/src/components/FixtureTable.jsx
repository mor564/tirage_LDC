import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Tableau des affiches : pour chacune des 36 équipes, ses 8 adversaires
 * regroupés par chapeau, avec le lieu (D : reçoit, E : se déplace) et la
 * journée. Un filtre par chapeau permet de restreindre l'affichage.
 */
const FixtureTable = ({ fixtureTable }) => {
  const [potFilter, setPotFilter] = useState(0); // 0 = tous les chapeaux

  const rows = potFilter === 0
    ? fixtureTable
    : fixtureTable.filter(entry => entry.team.pot === potFilter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm text-white/60">Filtrer :</span>
        {[0, 1, 2, 3, 4].map(pot => (
          <button
            key={pot}
            type="button"
            onClick={() => setPotFilter(pot)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              potFilter === pot
                ? 'bg-uefa-gold font-semibold text-uefa-blue'
                : 'border border-white/20 text-white/70 hover:border-uefa-gold/60'
            }`}
          >
            {pot === 0 ? 'Tous' : `Chapeau ${pot}`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {rows.map((entry, index) => (
          <motion.article
            key={entry.team.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4) }}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left"
          >
            <header className="mb-3 flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
              <h3 className="font-bold text-uefa-gold">{entry.team.name}</h3>
              <span className="shrink-0 text-xs text-white/50">
                {entry.team.country} · Ch.{entry.team.pot}
              </span>
            </header>

            <ul className="space-y-1">
              {entry.opponents.map(opponent => (
                <li key={opponent.id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-8 shrink-0 text-[11px] text-white/40">Ch.{opponent.pot}</span>
                  <span
                    className={`w-5 shrink-0 rounded text-center text-[11px] font-bold ${
                      opponent.venue === 'H'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-sky-500/20 text-sky-300'
                    }`}
                    title={opponent.venue === 'H' ? 'À domicile' : 'À l’extérieur'}
                  >
                    {opponent.venue === 'H' ? 'D' : 'E'}
                  </span>
                  <span className="flex-1 truncate">{opponent.shortName}</span>
                  <span className="shrink-0 text-[11px] text-white/40">{opponent.country}</span>
                  <span className="w-7 shrink-0 text-right text-[11px] text-white/40">
                    J{opponent.matchday}
                  </span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
    </div>
  );
};

export default FixtureTable;
