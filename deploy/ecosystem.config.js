// RemiseCMR — configuration pm2.
//
// Démarrage :
//   cd /var/www/remisecmr
//   # charger d'abord les secrets dans l'environnement (voir DEPLOY.md) :
//   set -a && . /etc/remisecmr/remisecmr.env && set +a
//   pm2 start deploy/ecosystem.config.js
//   pm2 save && pm2 startup   # relance au boot
//
// IMPORTANT : les secrets (AUTH_SECRET, ENCRYPTION_KEY, DATABASE_URL, PDF_DIR,
// SUPER_ADMIN_*) ne sont PAS dans ce fichier versionné. Ils sont chargés depuis
// /etc/remisecmr/remisecmr.env (hors dépôt) avant `pm2 start`.
module.exports = {
  apps: [
    {
      name: "remisecmr",
      cwd: "/var/www/remisecmr",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      // SQLite + throttle de connexion en mémoire → une seule instance.
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_restarts: 10,
      restart_delay: 4000,
      max_memory_restart: "500M",
      out_file: "/var/log/remisecmr/out.log",
      error_file: "/var/log/remisecmr/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
