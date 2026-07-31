#!/usr/bin/env bash
# Instalación de revolico-bot en un VPS Linux.
# Es idempotente: se puede volver a ejecutar sin romper nada.

set -euo pipefail

VERDE='\033[0;32m'
AMARILLO='\033[0;33m'
SIN_COLOR='\033[0m'

paso()  { printf "\n${VERDE}==>${SIN_COLOR} %s\n" "$1"; }
aviso() { printf "${AMARILLO}⚠${SIN_COLOR}  %s\n" "$1"; }

DIR_PROYECTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# No usar sudo si ya se corre como root.
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "Este script necesita privilegios de root o sudo para instalar paquetes."
    exit 1
  fi
fi

echo ""
echo "======================================"
echo " Instalación de revolico-bot"
echo "======================================"
echo "Directorio del proyecto: $DIR_PROYECTO"

# --- Detección de distro y gestor de paquetes -------------------------------
paso "Detectando el sistema"
if [ ! -r /etc/os-release ]; then
  echo "No se pudo leer /etc/os-release. Instala Node 20+ y Chromium manualmente."
  exit 1
fi
# shellcheck disable=SC1091
. /etc/os-release

case "${ID:-}${ID_LIKE:-}" in
  *debian*|*ubuntu*)                 GESTOR="apt" ;;
  *rhel*|*fedora*|*centos*|*almalinux*|*rocky*) GESTOR="dnf" ;;
  *) echo "Distro no soportada automáticamente: ${PRETTY_NAME:-desconocida}"; exit 1 ;;
esac

ARQUITECTURA="$(uname -m)"
echo "Distro: ${PRETTY_NAME:-desconocida}"
echo "Gestor de paquetes: $GESTOR"
echo "Arquitectura: $ARQUITECTURA"

case "$ARQUITECTURA" in
  x86_64|amd64|aarch64|arm64) ;;
  *) echo "Arquitectura no soportada por Playwright: $ARQUITECTURA"; exit 1 ;;
esac

# --- Node.js ----------------------------------------------------------------
paso "Verificando Node.js"
necesita_node=1
if command -v node >/dev/null 2>&1; then
  version_actual="$(node --version)"
  mayor="$(echo "$version_actual" | sed 's/^v//' | cut -d. -f1)"
  if [ "$mayor" -ge 20 ]; then
    echo "Node $version_actual ya está instalado y cumple el mínimo. No se reinstala."
    necesita_node=0
  else
    aviso "Node $version_actual es anterior a la versión 20. Se actualizará."
  fi
else
  echo "Node no está instalado. Se instalará Node 20 LTS."
fi

if [ "$necesita_node" -eq 1 ]; then
  paso "Instalando Node.js 20 LTS"
  if [ "$GESTOR" = "apt" ]; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
    $SUDO apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | $SUDO -E bash -
    $SUDO dnf install -y nodejs
  fi
  echo "Node instalado: $(node --version)"
fi

# --- Utilidades básicas -----------------------------------------------------
paso "Instalando utilidades básicas"
if [ "$GESTOR" = "apt" ]; then
  $SUDO apt-get install -y curl git cron
else
  $SUDO dnf install -y curl git cronie
fi

# --- Dependencias del proyecto ---------------------------------------------
paso "Instalando dependencias de npm"
cd "$DIR_PROYECTO"
npm install --omit=dev

# --- Chromium para Playwright ----------------------------------------------
paso "Instalando Chromium para Playwright ($ARQUITECTURA)"
# --with-deps resuelve las librerías del sistema propias de cada distro y arch.
if [ -n "$SUDO" ]; then
  $SUDO env "PATH=$PATH" npx --yes playwright install --with-deps chromium
else
  npx --yes playwright install --with-deps chromium
fi

# --- Archivo .env -----------------------------------------------------------
paso "Preparando el archivo .env"
if [ -f "$DIR_PROYECTO/.env" ]; then
  echo ".env ya existe. No se toca."
else
  cp "$DIR_PROYECTO/.env.example" "$DIR_PROYECTO/.env"
  chmod 600 "$DIR_PROYECTO/.env"
  echo "Se creó .env a partir de .env.example."
  aviso "Edítalo si quieres notificaciones por Telegram: nano $DIR_PROYECTO/.env"
fi

# --- Verificación de la sesión ---------------------------------------------
paso "Verificando la sesión de Revolico"
if [ -f "$DIR_PROYECTO/sesion.json" ]; then
  chmod 600 "$DIR_PROYECTO/sesion.json"
  echo "sesion.json encontrado. Permisos ajustados a 600."
else
  aviso "Falta sesion.json — sin él el bot no puede funcionar."
  echo "   Genéralo en TU computadora (no en el VPS, hace falta pantalla):"
  echo "      node src/capture-session.js"
  echo "   Y luego súbelo:"
  echo "      scp sesion.json usuario@$(hostname -I 2>/dev/null | awk '{print $1}'):$DIR_PROYECTO/sesion.json"
fi

# --- Tests ------------------------------------------------------------------
paso "Ejecutando los tests"
if npm test >/dev/null 2>&1; then
  echo "Todos los tests pasan."
else
  aviso "Algún test falló. Revisa con: npm test"
fi

# --- Cron -------------------------------------------------------------------
# Minuto y hora aleatorios: evita el patrón exacto todos los días y reparte carga.
MINUTO=$((RANDOM % 60))
HORA=$((RANDOM % 5 + 3))   # entre las 3 y las 7 de la madrugada
LINEA_CRON="$MINUTO $HORA * * * cd $DIR_PROYECTO && /usr/bin/env node src/renew.js >> $DIR_PROYECTO/cron.log 2>&1"

paso "Instalación terminada"
echo ""
echo "Programa la corrida diaria (una sola vez cada 24 h) con:"
echo ""
echo "   crontab -e"
echo ""
echo "y pega esta línea:"
echo ""
echo "   $LINEA_CRON"
echo ""
echo "O instálala directamente con:"
echo ""
echo "   (crontab -l 2>/dev/null; echo \"$LINEA_CRON\") | crontab -"
echo ""
aviso "No aumentes la frecuencia: el límite de diseño es 1 corrida cada 24 horas."
echo ""
echo "Antes de programarlo, comprueba que todo funciona con una corrida manual:"
echo ""
echo "   cd $DIR_PROYECTO && node src/renew.js"
echo ""
