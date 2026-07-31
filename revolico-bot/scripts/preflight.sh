#!/usr/bin/env bash
# Diagnóstico previo del VPS. NO instala absolutamente nada.
# Solo revisa si la máquina es apta para correr revolico-bot.

set -uo pipefail

VERDE='\033[0;32m'
AMARILLO='\033[0;33m'
ROJO='\033[0;31m'
SIN_COLOR='\033[0m'

advertencias=0
bloqueantes=0

ok()      { printf "  ${VERDE}✓${SIN_COLOR} %s\n" "$1"; }
aviso()   { printf "  ${AMARILLO}⚠${SIN_COLOR} %s\n" "$1"; advertencias=$((advertencias + 1)); }
fallo()   { printf "  ${ROJO}✗${SIN_COLOR} %s\n" "$1"; bloqueantes=$((bloqueantes + 1)); }
titulo()  { printf "\n== %s ==\n" "$1"; }

echo ""
echo "======================================"
echo " Diagnóstico del VPS para revolico-bot"
echo "======================================"

titulo "Sistema operativo"
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  ok "Distro: ${PRETTY_NAME:-${NAME:-desconocida}}"
  case "${ID:-}" in
    debian|ubuntu)        ok "Gestor de paquetes: apt (soportado)" ;;
    rhel|centos|almalinux|rocky|fedora) ok "Gestor de paquetes: dnf (soportado)" ;;
    *)                    aviso "Distro no reconocida: setup-vps.sh podría no cubrirla. Instala Node y Chromium a mano." ;;
  esac
else
  aviso "No se pudo leer /etc/os-release: distro desconocida."
fi

titulo "Arquitectura"
arch="$(uname -m)"
case "$arch" in
  x86_64|amd64)  ok "Arquitectura: $arch (soportada)" ;;
  aarch64|arm64) ok "Arquitectura: $arch (soportada)" ;;
  *)             fallo "Arquitectura no soportada por Playwright: $arch" ;;
esac

titulo "Memoria"
if [ -r /proc/meminfo ]; then
  mem_total_kb=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
  mem_disp_kb=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)
  mem_total_mb=$((mem_total_kb / 1024))
  mem_disp_mb=$((mem_disp_kb / 1024))
  ok "RAM total: ${mem_total_mb} MB"
  if [ "$mem_disp_mb" -lt 1024 ]; then
    aviso "RAM disponible: ${mem_disp_mb} MB (menos de 1 GB). Chromium puede quedarse sin memoria."
    aviso "Considera añadir swap: fallocate -l 1G /swapfile && mkswap /swapfile && swapon /swapfile"
  else
    ok "RAM disponible: ${mem_disp_mb} MB"
  fi
else
  aviso "No se pudo leer /proc/meminfo."
fi

titulo "Espacio en disco"
disp_mb=$(df -Pm . | awk 'NR==2 {print $4}')
if [ -n "${disp_mb:-}" ]; then
  if [ "$disp_mb" -lt 2048 ]; then
    aviso "Espacio libre: ${disp_mb} MB (menos de 2 GB). Chromium ocupa cerca de 500 MB."
  else
    ok "Espacio libre: ${disp_mb} MB"
  fi
else
  aviso "No se pudo determinar el espacio libre."
fi

titulo "Node.js"
if command -v node >/dev/null 2>&1; then
  node_version="$(node --version)"
  node_major="$(echo "$node_version" | sed 's/^v//' | cut -d. -f1)"
  if [ "$node_major" -ge 20 ]; then
    ok "Node instalado: $node_version (cumple el mínimo de 20)"
  else
    aviso "Node instalado: $node_version — se requiere 20 o superior. setup-vps.sh lo actualizará."
  fi
else
  aviso "Node no está instalado. setup-vps.sh se encargará."
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm instalado: $(npm --version)"
else
  aviso "npm no está instalado."
fi

titulo "Herramientas necesarias"
for herramienta in curl git; do
  if command -v "$herramienta" >/dev/null 2>&1; then
    ok "$herramienta disponible"
  else
    aviso "$herramienta no está instalado (setup-vps.sh lo instalará)."
  fi
done

if command -v crontab >/dev/null 2>&1; then
  ok "crontab disponible (necesario para la programación diaria)"
else
  aviso "crontab no está disponible: harán falta systemd timers o instalar cron."
fi

titulo "Puertos en uso"
if command -v ss >/dev/null 2>&1; then
  en_escucha="$(ss -tlnp 2>/dev/null | awk 'NR>1 {print $4}' | sed 's/.*://' | sort -un | tr '\n' ' ')"
  if [ -n "${en_escucha// /}" ]; then
    ok "Puertos en escucha: ${en_escucha}"
    echo "     (revolico-bot no abre puertos; esto es solo para saber qué más corre aquí)"
  else
    ok "No hay puertos en escucha."
  fi
else
  aviso "'ss' no está disponible: no se pudo revisar los puertos."
fi

titulo "Conectividad"
if command -v curl >/dev/null 2>&1; then
  if curl -sS --max-time 10 -o /dev/null -w '%{http_code}' https://www.revolico.com >/tmp/revolico_http_code 2>/dev/null; then
    ok "Se alcanzó revolico.com (HTTP $(cat /tmp/revolico_http_code))"
  else
    aviso "No se pudo alcanzar revolico.com desde este VPS. Revisa DNS/firewall/geobloqueo."
  fi
  rm -f /tmp/revolico_http_code
else
  aviso "Sin curl no se puede probar la conectividad."
fi

titulo "Resultado"
if [ "$bloqueantes" -gt 0 ]; then
  printf "${ROJO}✗ El VPS NO es apto: %d problema(s) bloqueante(s).${SIN_COLOR}\n" "$bloqueantes"
  echo ""
  exit 1
elif [ "$advertencias" -gt 0 ]; then
  printf "${AMARILLO}⚠ El VPS es utilizable, con %d advertencia(s). Revísalas arriba.${SIN_COLOR}\n" "$advertencias"
  echo ""
  echo "Siguiente paso: bash scripts/setup-vps.sh"
  echo ""
  exit 0
else
  printf "${VERDE}✓ El VPS es apto. Sin advertencias.${SIN_COLOR}\n"
  echo ""
  echo "Siguiente paso: bash scripts/setup-vps.sh"
  echo ""
  exit 0
fi
