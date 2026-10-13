# Anota (nombre provisional)

Editor de PDF para el aula: importa un PDF, anota con bolígrafo, resaltador y texto, y exporta el PDF anotado.
Estilo visual inspirado en las apps de notas de iOS. Fase 1 del plan en `replica/architecture.md`.

## Ejecutar
```bash
npm install
npm run dev          # http://localhost:3000
```

## Probar
```bash
npm run build && npx next start -p 3100 &
node scripts/e2e.mjs   # importar, dibujar, texto, deshacer, recargar, exportar, móvil
```

## Estado
Los documentos y anotaciones se guardan en el navegador (IndexedDB). Postgres y login llegan en la fase 2.
Pendiente de verificar en un iPad real: dibujar con Apple Pencil y desplazar con el dedo.
