-- Schéma de la phase de ligue de l'UEFA Champions League 2026/27.
-- Les 36 équipes sont insérées par `node database/seed.js` à partir de data/teams.js.

CREATE DATABASE IF NOT EXISTS ldc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ldc_db;

-- L'ancien format à groupes n'existe plus depuis la réforme de la compétition.
DROP TABLE IF EXISTS draw_results;

DROP TABLE IF EXISTS draw_reveals;
DROP TABLE IF EXISTS draw_matches;
DROP TABLE IF EXISTS fixture_history;
DROP TABLE IF EXISTS draws;
DROP TABLE IF EXISTS teams;

CREATE TABLE teams (
  id            INT PRIMARY KEY,                 -- rang au classement par coefficient (1 à 36)
  name          VARCHAR(100) NOT NULL,
  short_name    VARCHAR(40)  NOT NULL,
  country       CHAR(3)      NOT NULL,           -- code association UEFA
  pot           TINYINT      NOT NULL,
  CONSTRAINT chk_pot CHECK (pot BETWEEN 1 AND 4),
  INDEX idx_pot (pot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE draws (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  seed        BIGINT UNSIGNED NOT NULL,          -- graine du tirage : permet de le rejouer à l'identique
  attempts    INT NOT NULL DEFAULT 1,            -- tentatives du solveur avant configuration valide
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE draw_matches (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  draw_id       INT NOT NULL,
  matchday      TINYINT NOT NULL,
  match_date    DATE NOT NULL,
  kickoff       TIME NOT NULL,                   -- 18:45 ou 21:00 CET
  home_team_id  INT NOT NULL,
  away_team_id  INT NOT NULL,
  FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id),
  UNIQUE KEY uq_fixture (draw_id, home_team_id, away_team_id),
  INDEX idx_matchday (draw_id, matchday)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ordre de révélation du tirage : chapeau après chapeau, boule après boule.
CREATE TABLE draw_reveals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  draw_id       INT NOT NULL,
  step_order    SMALLINT NOT NULL,               -- rang de sortie de la boule (1 à 36)
  pot           TINYINT NOT NULL,                -- bol dont la boule est issue
  team_id       INT NOT NULL,
  opponent_id   INT NOT NULL,
  venue         ENUM('H', 'A') NOT NULL,         -- H : reçoit, A : se déplace
  already_known TINYINT(1) NOT NULL DEFAULT 0,   -- affiche déjà révélée lors d'un tour précédent
  FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (opponent_id) REFERENCES teams(id),
  INDEX idx_step (draw_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Historique des saisons précédentes : une même affiche ne peut pas garder
-- le même hôte trois saisons consécutives (décision du Comité des compétitions
-- interclubs, art. 16.03). Table volontairement vide par défaut.
CREATE TABLE fixture_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  season        SMALLINT NOT NULL,               -- année de début de saison, ex. 2025 pour 2025/26
  home_team_id  INT NOT NULL,
  away_team_id  INT NOT NULL,
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id),
  UNIQUE KEY uq_history (season, home_team_id, away_team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
