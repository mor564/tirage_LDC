# Tirage au sort — Phase de ligue de l'UEFA Champions League 2026/27

Simulateur du tirage au sort de la phase de ligue : 36 équipes, 8 adversaires
chacune, 144 matchs répartis sur 8 journées.

## Démarrage

```bash
# Serveur (port 5000)
cd server && npm start

# Client (port 3000)
cd client && npm start
```

La base de données est facultative pour essayer l'application : si MySQL n'est
pas joignable, le serveur bascule automatiquement sur un stockage en mémoire et
le signale au démarrage (les tirages sont alors perdus au redémarrage).

Pour activer la persistance :

```bash
mysql -u root -p < server/database/schema.sql
cd server && npm run seed
```

## Règles implémentées

| Règle | Où |
|---|---|
| 36 équipes réparties en 4 chapeaux de 9 (art. 16.01) | [teams.js](server/data/teams.js) |
| 2 adversaires par chapeau, soit 8 au total (art. 16.02) | `buildPairings` — [drawEngine.js](server/services/drawEngine.js) |
| 1 adversaire à domicile et 1 à l'extérieur par chapeau (art. 16.02) | `orientPairings` — [drawEngine.js](server/services/drawEngine.js) |
| Pas d'adversaire de la même association (art. 16.02) | `candidatesFor` — [drawEngine.js](server/services/drawEngine.js) |
| Au plus 2 adversaires d'une même autre association (art. 16.02) | `candidatesFor` — [drawEngine.js](server/services/drawEngine.js) |
| Pas trois saisons consécutives avec le même hôte (art. 16.03) | `buildForbiddenHosts` — [drawEngine.js](server/services/drawEngine.js) |
| Ordre du tirage : bol par bol, chapeau 1 puis 2, 3, 4 | `buildPairings` — [drawEngine.js](server/services/drawEngine.js) |
| Garantie qu'une allocation complète reste possible | `canComplete` — [drawEngine.js](server/services/drawEngine.js) |
| 8 journées de 18 matchs, dates et horaires officiels | [scheduleEngine.js](server/services/scheduleEngine.js) |

### Déroulement du tirage

Le moteur suit l'ordre du tirage officiel plutôt qu'un ordre de résolution
optimisé : les boules du chapeau 1 sortent une à une, puis celles des chapeaux
2, 3 et 4 ; pour chaque équipe tirée, les adversaires encore inconnus sont
attribués chapeau par chapeau.

Chaque adversaire est choisi **au hasard parmi ceux qui laissent le tirage
complétable** pour toutes les équipes restantes — la garantie exigée par le
règlement. La faisabilité est vérifiée par un solveur à retour sur trace
(`canComplete`), dont l'état est intégralement restauré : il valide les choix,
il ne les fait pas.

Ce point n'est pas cosmétique. Une première version résolvait le problème en
traitant d'abord les équipes les plus contraintes (heuristique MRV). Le
résultat est valide mais les probabilités sont faussées : sur le chapeau 1,
`PSG – Bayern` sortait dans 11,3 % des tirages contre 19,0 % attendus, et
`Real Madrid – Bayern` dans 32,7 % contre 27,0 %. En suivant l'ordre officiel,
ces valeurs remontent respectivement à 16,3 % et 27,3 % (mesure sur 300
tirages ; les probabilités exactes ont été obtenues par énumération des 4 866
configurations valides du chapeau 1).

### Domicile / extérieur

Une fois les appariements connus, le sous-graphe des rencontres entre deux
chapeaux donnés est 2-régulier : c'est donc une union de cycles disjoints.
Orienter chaque cycle dans un sens unique donne à chaque équipe exactement une
réception et un déplacement par chapeau — la condition est donc **toujours**
satisfaisable, et il reste deux sens possibles par cycle pour respecter la
règle des trois saisons consécutives.

### Calendrier

Répartir 144 matchs sur 8 journées en faisant jouer chaque équipe une fois par
journée revient à colorier les arêtes du graphe 8-régulier des rencontres avec
8 couleurs. La résolution se fait par retour sur trace, puis une phase
d'optimisation par **échanges de Kempe** réduit les enchaînements de trois
réceptions ou trois déplacements consécutifs.

Cette dernière contrainte est traitée comme souple : elle ne figure pas dans le
règlement fourni. Environ 40 à 50 % des calendriers générés l'annulent
complètement, et il reste en moyenne moins d'une équipe concernée sur 36.

## API

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/health` | État du serveur et mode de stockage |
| `GET` | `/api/teams` | Les 36 équipes |
| `GET` | `/api/teams/pots` | Les équipes groupées par chapeau |
| `GET` | `/api/teams/:id` | Une équipe |
| `POST` | `/api/draw/perform` | Lance un tirage (corps facultatif : `{ "seed": 2027 }`) |
| `GET` | `/api/draw/latest` | Dernier tirage |
| `GET` | `/api/draw/:id` | Un tirage donné |
| `GET` | `/api/draw/audit` | Contrôle de conformité du dernier tirage |

Chaque tirage est enregistré avec sa **graine** : rejouer `POST /api/draw/perform`
avec la même graine reproduit exactement le même tirage, ce qui permet le
contrôle par un auditeur externe.

## Vérification

```bash
cd server && npm run verify        # 100 tirages par défaut
node scripts/verify.js 25          # ou un nombre au choix
```

Le script exécute des tirages complets sans base de données et contrôle chaque
condition du règlement, puis affiche les statistiques de calendrier et
d'uniformité. Il sort en code 1 à la moindre violation.

La route `GET /api/draw/audit` effectue le même contrôle sur un tirage
enregistré.
