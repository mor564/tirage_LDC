// Couleur d'accent propre à chaque chapeau, réutilisée par tous les écrans pour
// que l'origine d'une équipe se lise d'un coup d'œil.
export const POT_STYLES = {
  1: { label: 'Chapeau 1', chip: 'bg-amber-400 text-amber-950', dot: 'bg-amber-400', ring: 'ring-amber-400/40', text: 'text-amber-300', glow: 'shadow-amber-400/30' },
  2: { label: 'Chapeau 2', chip: 'bg-sky-400 text-sky-950', dot: 'bg-sky-400', ring: 'ring-sky-400/40', text: 'text-sky-300', glow: 'shadow-sky-400/30' },
  3: { label: 'Chapeau 3', chip: 'bg-emerald-400 text-emerald-950', dot: 'bg-emerald-400', ring: 'ring-emerald-400/40', text: 'text-emerald-300', glow: 'shadow-emerald-400/30' },
  4: { label: 'Chapeau 4', chip: 'bg-violet-400 text-violet-950', dot: 'bg-violet-400', ring: 'ring-violet-400/40', text: 'text-violet-300', glow: 'shadow-violet-400/30' },
};

export const potStyle = pot => POT_STYLES[pot] || POT_STYLES[1];
