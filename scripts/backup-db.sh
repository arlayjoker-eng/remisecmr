#!/usr/bin/env bash
# Sauvegarde de la base SQLite de RemiseCMR.
# À exécuter via cron sur le VPS. Nécessite sqlite3 et gzip.
#
# Installation (une fois) :
#   sudo apt install -y sqlite3
#   chmod +x scripts/backup-db.sh
#   crontab -e   puis ajouter (sauvegarde tous les jours à 2h) :
#   0 2 * * * /chemin/vers/remisecmr/scripts/backup-db.sh >> /chemin/vers/remisecmr/backups/backup.log 2>&1
set -euo pipefail

# Racine du projet (le script vit dans scripts/)
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_FILE="$APP_DIR/prisma/dev.db"     # ajuster si la base prod a un autre nom
BACKUP_DIR="$APP_DIR/backups"
KEEP=30                              # nombre de sauvegardes conservées

if [ ! -f "$DB_FILE" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — ERREUR : base introuvable ($DB_FILE)" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
DEST="$BACKUP_DIR/remisecmr_$STAMP.db"

# .backup = copie cohérente même pendant que l'app écrit
sqlite3 "$DB_FILE" ".backup '$DEST'"
gzip -f "$DEST"

# Ne conserver que les KEEP sauvegardes les plus récentes
ls -1t "$BACKUP_DIR"/remisecmr_*.db.gz 2>/dev/null \
  | tail -n +$((KEEP + 1)) | xargs -r rm --

echo "$(date '+%Y-%m-%d %H:%M:%S') — sauvegarde OK : $(basename "$DEST").gz"
