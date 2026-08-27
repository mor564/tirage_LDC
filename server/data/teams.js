// Les 36 participants de la phase de ligue, répartis dans les 4 chapeaux.
// `seeding` correspond au rang officiel (1 à 36) issu du classement par
// coefficient établi en début de saison ; le tenant du titre est tête de
// série du chapeau 1 (règlement 16.01).

const TEAMS = [
  // Chapeau 1
  { seeding: 1, name: 'Paris Saint-Germain', shortName: 'PSG', country: 'FRA', pot: 1 },
  { seeding: 2, name: 'FC Bayern München', shortName: 'Bayern', country: 'GER', pot: 1 },
  { seeding: 3, name: 'Real Madrid C.F.', shortName: 'Real Madrid', country: 'ESP', pot: 1 },
  { seeding: 4, name: 'Liverpool FC', shortName: 'Liverpool', country: 'ENG', pot: 1 },
  { seeding: 5, name: 'FC Internazionale Milano', shortName: 'Inter', country: 'ITA', pot: 1 },
  { seeding: 6, name: 'Manchester City', shortName: 'Man City', country: 'ENG', pot: 1 },
  { seeding: 7, name: 'Arsenal FC', shortName: 'Arsenal', country: 'ENG', pot: 1 },
  { seeding: 8, name: 'FC Barcelona', shortName: 'Barcelona', country: 'ESP', pot: 1 },
  { seeding: 9, name: 'Atlético de Madrid', shortName: 'Atlético', country: 'ESP', pot: 1 },

  // Chapeau 2
  { seeding: 10, name: 'Borussia Dortmund', shortName: 'Dortmund', country: 'GER', pot: 2 },
  { seeding: 11, name: 'AS Roma', shortName: 'Roma', country: 'ITA', pot: 2 },
  { seeding: 12, name: 'Sporting Clube de Portugal', shortName: 'Sporting CP', country: 'POR', pot: 2 },
  { seeding: 13, name: 'Aston Villa', shortName: 'Aston Villa', country: 'ENG', pot: 2 },
  { seeding: 14, name: 'FC Porto', shortName: 'Porto', country: 'POR', pot: 2 },
  { seeding: 15, name: 'Manchester United', shortName: 'Man United', country: 'ENG', pot: 2 },
  { seeding: 16, name: 'Club Brugge KV', shortName: 'Club Brugge', country: 'BEL', pot: 2 },
  { seeding: 17, name: 'Real Betis Balompié', shortName: 'Real Betis', country: 'ESP', pot: 2 },
  { seeding: 18, name: 'PSV Eindhoven', shortName: 'PSV', country: 'NED', pot: 2 },

  // Chapeau 3
  { seeding: 19, name: 'Feyenoord', shortName: 'Feyenoord', country: 'NED', pot: 3 },
  { seeding: 20, name: 'LOSC Lille', shortName: 'Lille', country: 'FRA', pot: 3 },
  { seeding: 21, name: 'FK Bodø/Glimt', shortName: 'Bodø/Glimt', country: 'NOR', pot: 3 },
  { seeding: 22, name: 'SSC Napoli', shortName: 'Napoli', country: 'ITA', pot: 3 },
  { seeding: 23, name: 'RB Leipzig', shortName: 'Leipzig', country: 'GER', pot: 3 },
  { seeding: 24, name: 'Villarreal CF', shortName: 'Villarreal', country: 'ESP', pot: 3 },
  { seeding: 25, name: 'Fenerbahçe SK', shortName: 'Fenerbahçe', country: 'TUR', pot: 3 },
  { seeding: 26, name: 'FC Shakhtar Donetsk', shortName: 'Shakhtar', country: 'UKR', pot: 3 },
  { seeding: 27, name: 'Galatasaray A.Ş.', shortName: 'Galatasaray', country: 'TUR', pot: 3 },

  // Chapeau 4
  { seeding: 28, name: 'SK Slavia Praha', shortName: 'Slavia Praha', country: 'CZE', pot: 4 },
  { seeding: 29, name: 'ŠK Slovan Bratislava', shortName: 'Slovan', country: 'SVK', pot: 4 },
  { seeding: 30, name: 'VfB Stuttgart', shortName: 'Stuttgart', country: 'GER', pot: 4 },
  { seeding: 31, name: 'AEK Athens FC', shortName: 'AEK Athens', country: 'GRE', pot: 4 },
  { seeding: 32, name: 'LASK', shortName: 'LASK', country: 'AUT', pot: 4 },
  { seeding: 33, name: 'Como 1907', shortName: 'Como', country: 'ITA', pot: 4 },
  { seeding: 34, name: 'RC Lens', shortName: 'Lens', country: 'FRA', pot: 4 },
  { seeding: 35, name: 'Viking FK', shortName: 'Viking', country: 'NOR', pot: 4 },
  { seeding: 36, name: 'Sabah FC', shortName: 'Sabah', country: 'AZE', pot: 4 },
];

module.exports = { TEAMS };
