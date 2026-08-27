import React from 'react';
import { motion } from 'framer-motion';

/**
 * Les quatre bols du tirage : 9 équipes par chapeau, dans l'ordre du classement
 * par coefficient (le tenant du titre étant tête de série du chapeau 1).
 */
const TeamList = ({ pots }) => (
  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
    {pots.map(({ pot, teams }, potIndex) => (
      <motion.section
        key={pot}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: potIndex * 0.08 }}
        className="rounded-xl bg-white/10 p-5 shadow-xl backdrop-blur"
      >
        <h3 className="mb-4 border-b border-uefa-gold/40 pb-2 text-xl font-bold text-uefa-gold">
          Chapeau {pot}
        </h3>
        <ol className="space-y-2">
          {teams.map(team => (
            <li key={team.id} className="flex items-baseline gap-2 text-left">
              <span className="w-6 shrink-0 text-xs text-white/40">{team.seeding}</span>
              <span className="flex-1 text-sm font-medium">{team.name}</span>
              <span className="shrink-0 text-xs text-white/50">{team.country}</span>
            </li>
          ))}
        </ol>
      </motion.section>
    ))}
  </div>
);

export default TeamList;
