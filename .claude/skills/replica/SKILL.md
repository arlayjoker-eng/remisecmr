---
name: replica
description: Replicar (clonar) una aplicación o web existente. Úsala cuando el usuario pida "replicar", "clonar", "copiar" o "hacer igual que" una app, web o pantalla, a partir de una URL, capturas de pantalla, un repositorio o una descripción.
---

# Réplica: replicar una app

Objetivo: reconstruir la funcionalidad y el diseño de una app de referencia, con código propio y limpio, dentro del stack del proyecto actual.

## 1. Reunir la referencia
- **URL**: abrirla con Playwright (Chromium está en `/opt/pw-browsers/chromium`), hacer capturas a escritorio (1440px) y móvil (390px) y extraer textos, colores, tipografías y estructura.
- **Capturas**: leerlas con Read e inventariar pantallas y componentes.
- **Repositorio**: leer la estructura, el modelo de datos y las rutas antes de escribir nada.
- Si falta información crítica (pantallas, login, datos), preguntar una sola vez y de forma concreta.

## 2. Inventario (antes de programar)
Listar en `REPLICA_PLAN.md`:
- Pantallas y rutas.
- Componentes reutilizables (header, tarjetas, formularios, tablas, modales).
- Tokens de diseño: colores, fuentes, espaciados, radios y sombras.
- Datos y entidades (modelo Prisma si el proyecto usa Prisma), además de las acciones del usuario.
- Lo que queda fuera de alcance.

## 3. Construir
- Usar el stack existente. En este repo es Next.js, TypeScript y Prisma: rutas en `src/app`, componentes en `src/components` y esquema en `prisma/schema.prisma`.
- Orden de trabajo: tokens de diseño → layout → componentes → pantallas → datos y lógica → estados vacíos, de carga y de error.
- Diseño responsive desde móvil. Accesibilidad: etiquetas, contraste y foco.
- Nunca copiar logotipos, marcas, textos legales ni assets con copyright. Usar marcadores de posición y el nombre/marca del usuario.

## 4. Verificar
- `npm run build` y lint sin errores.
- Levantar la app, hacer capturas de cada pantalla y compararlas lado a lado con la referencia. Iterar hasta que coincidan.
- Resumir al usuario las diferencias que queden y los siguientes pasos.
