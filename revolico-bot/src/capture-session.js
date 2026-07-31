'use strict';

// Captura manual de la sesión de Revolico.
//
// SEGURIDAD: este script NUNCA pide, lee, almacena ni transmite usuario o
// contraseña. El login lo hace la persona a mano en la ventana del navegador.
// No hay autofill de credenciales, ni siquiera desactivado por defecto.

require('dotenv').config();

const os = require('os');
const readline = require('readline');
const browserFactory = require('./browser');
const { loadConfig, resolveSelector, SESSION_PATH } = require('./config');

/** Espera a que la persona pulse Enter en la terminal. */
function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const config = loadConfig();
  const signinUrl = `${config.baseUrl}${config.paths.signin}`;
  const accountUrl = `${config.baseUrl}${config.paths.account}`;

  console.log('');
  console.log('=== Captura de sesión de Revolico ===');
  console.log('');
  console.log('Se abrirá una ventana de Chromium en la página de inicio de sesión.');
  console.log('Inicia sesión TÚ MISMO en esa ventana, con normalidad.');
  console.log('Este programa no ve, ni guarda, ni envía tu usuario o contraseña.');
  console.log('');

  const { browser, context, page } = await browserFactory.launch({
    headless: false,
    useSession: false,
    config,
  });

  try {
    await page.goto(signinUrl, { waitUntil: 'domcontentloaded' });

    await waitForEnter('Cuando hayas terminado de iniciar sesión, vuelve aquí y pulsa ENTER... ');

    console.log('Verificando que la sesión sea válida...');
    await page.goto(accountUrl, { waitUntil: 'domcontentloaded' });

    const finalUrl = page.url();
    if (finalUrl.includes(config.paths.auth)) {
      console.error('');
      console.error('❌ La verificación falló: al abrir /account fuiste redirigido a la pantalla de login.');
      console.error('   Parece que la sesión no quedó iniciada. No se guardó nada.');
      console.error('   Vuelve a ejecutar este script e inicia sesión antes de pulsar ENTER.');
      process.exitCode = 1;
      return;
    }

    const indicator = await resolveSelector(page, config.selectors.loginIndicator);
    if (!indicator) {
      console.error('');
      console.error('❌ La verificación falló: no se encontró ninguna señal de sesión iniciada en /account.');
      console.error('   No se guardó nada. Si crees que sí iniciaste sesión, revisa');
      console.error('   "loginIndicator" en config.json y vuelve a intentarlo.');
      process.exitCode = 1;
      return;
    }

    await context.storageState({ path: SESSION_PATH });

    console.log('');
    console.log(`✅ Sesión verificada y guardada en: ${SESSION_PATH}`);
    console.log('');
    console.log('Para subirla al VPS, ejecuta desde ESTA computadora:');
    console.log('');
    console.log(`   scp ${SESSION_PATH} usuario@IP_DEL_VPS:~/revolico-bot/sesion.json`);
    console.log('');
    console.log('Sustituye "usuario" e "IP_DEL_VPS" por los tuyos.');
    console.log('Recuerda: sesion.json es tan sensible como tu contraseña. No lo compartas ni lo subas a git.');
    console.log(`(Este equipo es ${os.hostname()}.)`);
    console.log('');
  } finally {
    await browserFactory.close(browser, context);
  }
}

main().catch((err) => {
  console.error(`❌ Error inesperado: ${err.message}`);
  process.exit(1);
});
