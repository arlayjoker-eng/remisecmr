# Déploiement RemiseCMR sur VPS

Kiosque iPad du Collège Mont-Royal. Stack : Next.js 15 (prod) · SQLite + Prisma ·
NextAuth · derrière Nginx (reverse proxy TLS) avec pm2 **ou** systemd.

> ⚠️ **Deux secrets sont vitaux et ne doivent JAMAIS être perdus ou changés après
> la mise en service :**
> - `AUTH_SECRET` — change → toutes les sessions sont invalidées (gênant, pas fatal).
> - `ENCRYPTION_KEY` — **change ou perte → toutes les signatures et CNI chiffrées
>   deviennent illisibles, de façon irréversible.** Sauvegardez-la hors du serveur.

---

## 1. Prérequis serveur

- Debian/Ubuntu à jour, Node.js LTS (≥ 20), Nginx, certbot.
- Un domaine pointant sur le VPS (ex. `remisecmr.example.qc.ca`).

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
# Node LTS via nodesource ou nvm (au choix)
```

## 2. Utilisateur et dossiers de données

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin remisecmr
sudo mkdir -p /var/www/remisecmr /var/lib/remisecmr/pdfs /var/log/remisecmr /etc/remisecmr
sudo chown -R remisecmr:remisecmr /var/lib/remisecmr /var/log/remisecmr
sudo chmod 700 /var/lib/remisecmr /var/lib/remisecmr/pdfs   # données d'élèves + signatures
```

## 3. Code et dépendances

```bash
sudo -u remisecmr git clone <repo> /var/www/remisecmr   # ou rsync du build
cd /var/www/remisecmr
sudo -u remisecmr npm ci
```

## 4. Secrets (hors dépôt)

```bash
sudo tee /etc/remisecmr/remisecmr.env >/dev/null <<'EOF'
DATABASE_URL="file:/var/lib/remisecmr/db.sqlite"
PDF_DIR="/var/lib/remisecmr/pdfs"
AUTH_TRUST_HOST="true"
AUTH_SECRET="__COLLER_openssl_rand_-base64_48__"
ENCRYPTION_KEY="__COLLER_openssl_rand_-base64_32__"
SUPER_ADMIN_EMAIL="agarcia@collegemont-royal.qc.ca"
SUPER_ADMIN_PASSWORD="__mot_de_passe_fort__"
EOF
sudo chmod 600 /etc/remisecmr/remisecmr.env
sudo chown remisecmr:remisecmr /etc/remisecmr/remisecmr.env

# Générer les secrets :
openssl rand -base64 48   # → AUTH_SECRET
openssl rand -base64 32   # → ENCRYPTION_KEY  (SAUVEGARDER hors serveur !)
```

## 5. Base de données, build, seed

```bash
cd /var/www/remisecmr
set -a && . /etc/remisecmr/remisecmr.env && set +a

sudo -u remisecmr --preserve-environment npx prisma migrate deploy
sudo -u remisecmr --preserve-environment npm run build
sudo -u remisecmr --preserve-environment npm run db:seed   # crée le SUPER_ADMIN
```

Les élèves et casiers se chargent ensuite via **Admin › Importer les listes**
(CSV/Excel), pas par le seed.

## 6. Service — pm2 OU systemd

**Option A — systemd (recommandé) :**
```bash
sudo cp deploy/remisecmr.service /etc/systemd/system/remisecmr.service
sudo systemctl daemon-reload
sudo systemctl enable --now remisecmr
sudo systemctl status remisecmr
```

**Option B — pm2 :**
```bash
cd /var/www/remisecmr
set -a && . /etc/remisecmr/remisecmr.env && set +a
pm2 start deploy/ecosystem.config.js
pm2 save && pm2 startup
```

## 7. Nginx + TLS

```bash
sudo cp deploy/nginx/remisecmr.conf /etc/nginx/sites-available/remisecmr
# éditer le server_name puis :
sudo ln -s /etc/nginx/sites-available/remisecmr /etc/nginx/sites-enabled/
sudo certbot --nginx -d remisecmr.example.qc.ca
sudo nginx -t && sudo systemctl reload nginx
```

## 8. Sauvegardes

- `scripts/backup-db.sh` copie la base SQLite — planifier via cron (quotidien).
- Sauvegarder aussi `/var/lib/remisecmr/pdfs` (récépissés signés) et, **séparément
  et en lieu sûr, la valeur de `ENCRYPTION_KEY`**.

## 9. Vérifications post-déploiement

```bash
curl -sI https://remisecmr.example.qc.ca/login | grep -iE 'content-security-policy|strict-transport|x-frame'
curl -s -o /dev/null -w "%{http_code}\n" https://remisecmr.example.qc.ca/api/me   # → 401 sans session
```

Puis : connexion SUPER_ADMIN, import d'une liste de test, une remise de portable
avec signature, ouverture du récépissé PDF, et une attribution de casier
(vérifier que la combinaison n'apparaît qu'à la confirmation).

## Mises à jour ultérieures

```bash
cd /var/www/remisecmr
sudo -u remisecmr git pull
set -a && . /etc/remisecmr/remisecmr.env && set +a
sudo -u remisecmr --preserve-environment npm ci
sudo -u remisecmr --preserve-environment npx prisma migrate deploy
sudo -u remisecmr --preserve-environment npm run build
sudo systemctl restart remisecmr   # ou : pm2 reload remisecmr
```
