# revolico-bot

Renueva automáticamente **tus propios anuncios** de [revolico.com](https://www.revolico.com)
una vez cada 24 horas, desde un VPS Linux.

Revolico no tiene API pública, así que el bot usa Playwright con una sesión que
**tú capturas manualmente una sola vez** iniciando sesión a mano en una ventana de
navegador. El programa nunca ve, ni guarda, ni envía tu usuario o contraseña.

---

## Cómo funciona

1. Abre `/account` con la sesión guardada en `sesion.json`.
2. Extrae los **IDs numéricos** de tus anuncios con la regex `/item/(\d+)` sobre los `href`.
3. Deduplica los IDs y baraja el orden.
4. Para cada ID **construye la URL de gestión** `/item/{ID}/_/manage` y navega directo.
5. Clickea "Renovar" en esa página y pasa al siguiente, con pausas aleatorias.

La página de gestión es una **URL, no un botón**. Al construirla en vez de navegar
por la interfaz, el único selector CSS del que depende todo el sistema es el botón
"Renovar". Eso reduce a la mitad la superficie de fallo.

---

## Requisitos

- Un VPS Linux (Debian/Ubuntu o RHEL/Alma/Rocky), x86_64 o ARM64
- Node.js 20 o superior
- Una computadora con pantalla para el paso de captura de sesión
- Al menos 1 GB de RAM libre y 2 GB de disco (Chromium pesa)

---

## Despliegue paso a paso

### 1. Comprueba que el VPS sirve

```bash
git clone <tu-repo> && cd revolico-bot
bash scripts/preflight.sh
```

Solo diagnostica: no instala nada. Te dice si falta RAM, disco, Node o conectividad.

### 2. Instala

```bash
bash scripts/setup-vps.sh
```

Es idempotente: si Node 20+ ya está, no lo reinstala. Detecta la distro (apt o dnf)
y la arquitectura, e instala el Chromium correcto.

### 3. Captura la sesión — **en tu computadora, no en el VPS**

Este paso necesita pantalla, porque el login lo haces tú a mano.

```bash
node src/capture-session.js
```

Se abre una ventana de Chromium en la pantalla de inicio de sesión. Inicia sesión
con normalidad, vuelve a la terminal y pulsa ENTER. El script verifica que la
sesión quedó activa antes de guardar y, si falla, **no guarda nada**.

Al terminar te imprime el comando `scp` exacto para subir el archivo:

```bash
scp sesion.json usuario@IP_DEL_VPS:~/revolico-bot/sesion.json
```

> `sesion.json` es tan sensible como tu contraseña: da acceso a tu cuenta.
> No lo compartas ni lo subas a git (`.gitignore` ya lo bloquea).

### 4. Mapea el botón "Renovar"

El DOM de Revolico no está documentado, así que hay que confirmar el selector una vez:

```bash
node src/discover.js
```

Guarda el HTML y capturas de pantalla en `discovery/` e imprime un reporte con
todos los botones y enlaces de la página de gestión, indicando cuál parece ser
"Renovar" y **si está habilitado o deshabilitado**.

Si el reporte dice que ningún candidato encontró el botón, copia el selector
correcto desde la lista de botones y agrégalo al array `renewButton` de
`config.json`. Los candidatos se prueban en orden hasta que uno funciona.

> **Cuidado con los selectores de texto suelto.** No agregues `text=Renovar` a
> `renewButton`: en Playwright ese selector busca por subcadena sin distinguir
> mayúsculas, así que también matchea el mensaje de espera *"Podrás **renovar**
> en 6 horas"* — el bot creería que hay un botón y trataría un anuncio en
> cooldown como renovado. Usa siempre candidatos limitados a elementos
> clickeables (`button:has-text(...)`, `a:has-text(...)`, `[data-action=...]`).

### 5. Configura las notificaciones (opcional)

```bash
nano .env
```

```
TELEGRAM_TOKEN=el-token-que-te-da-@BotFather
TELEGRAM_CHAT_ID=tu-chat-id
```

Si lo dejas vacío el bot funciona igual, solo que sin avisos.

### 6. Prueba una corrida manual

```bash
node src/renew.js
```

Revisa la salida y `renovar.log`. Si todo se ve bien, programa el cron.

### 7. Programa la corrida diaria

`setup-vps.sh` te imprime al final una línea de cron con minuto y hora aleatorios.
Instálala con `crontab -e`, o directamente:

```bash
(crontab -l 2>/dev/null; echo "37 4 * * * cd ~/revolico-bot && /usr/bin/env node src/renew.js >> ~/revolico-bot/cron.log 2>&1") | crontab -
```

> **Una sola corrida cada 24 horas.** No subas la frecuencia: los anuncios no se
> pueden renovar antes de ese plazo y visitar el sitio más seguido no aporta nada.

---

## Estados y códigos de salida

Cada anuncio termina en uno de tres estados:

| Estado | Significado |
|---|---|
| `renovado` | Se clickeó "Renovar" correctamente |
| `no_elegible` | Todavía no pasaron las 24 h — **es normal, no es un fallo** |
| `error` | Algo salió mal con ese anuncio en particular |

Solo `error` merece atención. Códigos de salida del proceso:

| Código | Situación |
|---|---|
| 0 | Corrida normal (incluye anuncios no elegibles y errores sueltos) |
| 1 | Falta `sesion.json` o `config.json`, o la sesión expiró |
| 2 | Se detectó un CAPTCHA |
| 3 | Los selectores no encuentran nada — hay que revisar `config.json` |

---

## Problemas frecuentes

**"La sesión expiró"** — Las cookies caducan cada cierto tiempo. Vuelve al paso 3:
regenera `sesion.json` en tu computadora y súbelo de nuevo. El bot re-guarda la
sesión después de cada corrida para alargarla lo más posible.

**"El botón Renovar no apareció en NINGÚN anuncio"** — Revolico cambió su HTML.
Ejecuta `node src/discover.js` y actualiza `renewButton` en `config.json`.

**"CAPTCHA detectado"** — El bot se detiene limpiamente y avisa. No intenta
resolverlo ni evadirlo. Entra al sitio a mano, resuélvelo, y deja que la próxima
corrida siga su curso.

**"Executable doesn't exist" al lanzar Chromium** — El navegador de Playwright no
está instalado o no coincide con la versión del paquete. Ejecuta
`npx playwright install chromium`. Si prefieres usar el Chromium del sistema,
define `CHROMIUM_PATH=/usr/bin/chromium` en `.env`.

**Todos los anuncios salen `no_elegible`** — Lo más probable es que sea correcto:
aún no cumplen las 24 h. Confírmalo con `discover.js`, que te dice el texto exacto
de espera que muestra la página.

---

## Estructura

```
revolico-bot/
├── config.json             # URLs y selectores — TODO se configura aquí
├── src/
│   ├── capture-session.js  # login manual → sesion.json
│   ├── discover.js         # mapeo del DOM
│   ├── renew.js            # proceso principal (el que corre el cron)
│   ├── browser.js          # contexto de Playwright
│   ├── config.js           # buildManageUrl / resolveSelector
│   ├── ads.js              # extracción de IDs, barajado, delays
│   ├── notifier.js         # Telegram
│   ├── logger.js           # log con rotación
│   └── state.js            # estado.json entre corridas
├── scripts/
│   ├── preflight.sh        # diagnóstico (no instala)
│   └── setup-vps.sh        # instalación
└── test/                   # tests unitarios (node:test)
```

Ningún selector CSS está escrito dentro del código: todos viven en `config.json`
como **arrays de candidatos** que se prueban en orden. Cuando Revolico cambie su
HTML, se arregla agregando un candidato al array, sin tocar el código.

## Tests

```bash
npm test
```

Son unitarios y no tocan la red: no hacen peticiones a Revolico.

---

## Notas de seguridad

- **Sin credenciales.** El proyecto no pide, lee, almacena ni transmite usuario o
  contraseña en ningún punto. Toda la autenticación pasa por `sesion.json`.
- **Sin bypass de CAPTCHA.** Si aparece uno, el proceso se detiene y avisa.
- **Sin datos sensibles en los logs.** Nunca se registran cookies ni tokens.
- `.gitignore` bloquea `sesion.json`, `.env`, los logs, `estado.json` y `discovery/`.
- Trata `sesion.json` como una contraseña: permisos `600` y nunca en un repositorio.
