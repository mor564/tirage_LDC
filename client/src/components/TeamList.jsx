import React from 'react';
import { motion } from 'framer-motion';
import TeamCrest from './TeamCrest';
import { potStyle } from './potStyles';

/**
 * Les quatre bols du tirage : 9 équipes par chapeau, dans l'ordre du classement
 * par coefficient (le tenant du titre étant tête de série du chapeau 1).
 */
const TeamList = ({ pots }) => (
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
    {pots.map(({ pot, teams }, potIndex) => {
      const style = potStyle(pot);
      return (
        <motion.section
          key={pot}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: potIndex * 0.1 }}
          className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl ring-1 ${style.ring} backdrop-blur`}
        >
          <header className={`flex items-center justify-between px-4 py-3 ${style.chip}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider">{style.label}</h3>
            <span className="text-xs font-semibold opacity-70">{teams.length} équipes</span>
          </header>

          <motion.ol
            className="divide-y divide-white/5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { delayChildren: 0.2 + potIndex * 0.1, staggerChildren: 0.045 } },
            }}
          >
            {teams.map(team => (
              <motion.li
                key={team.id}
                variants={{
                  hidden: { opacity: 0, x: -16 },
                  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
                }}
                whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-5 shrink-0 text-left text-[11px] tabular-nums text-white/30">
                  {team.seeding}
                </span>
                <TeamCrest team={team} size="sm" />
                <span className="flex-1 truncate text-left text-sm font-medium">{team.shortName}</span>
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-white/50">
                  {team.country}
                </span>
              </motion.li>
            ))}
          </motion.ol>
        </motion.section>
      );
    })}
  </div>
);

export default TeamList;
