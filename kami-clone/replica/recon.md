# Recon: Kami (borrador v0)

Estado: **borrador**. Kami (kamiapp.com, help.kamiapp.com, intercom.help) está
bloqueado por la red del entorno. Solo hay datos de búsquedas web. Todo lo
marcado `?` está por verificar con capturas o con acceso a la ayuda de Kami.

Objetivo: uso escolar, proyecto aparte. Alcance: todo, por fases. Tamaño: **XL**.

## Fuentes (fecha de lectura: 2026-10-13)
| fuente | qué dio |
| --- | --- |
| Chrome Web Store, ficha de Kami | herramientas de dibujo, regla, transportador, medios (Drive, Google Imágenes, YouTube) |
| help.kamiapp.com, "Working on Kami assignments in Google Classroom as a student" | el alumno abre la tarea desde Classwork; extensión necesaria; en tablet, enlace "Open with Kami" |
| help.kamiapp.com, "How to use the Kami add-on in Google Classroom" | el profesor restringe herramientas por tarea o alumno y edita tareas ya asignadas |
| kamiapp.com, precios | gratis (Basic, 10+ herramientas), Teacher (~99-149 USD/año, contradictorio), School/District (a medida) |

## Roles
Alumno, Profesor, Administrador de centro `?`

## Pantallas (S-IDs, provisionales)
| ID | pantalla | propósito |
| --- | --- | --- |
| S01 | Panel / biblioteca de documentos | abrir, subir, buscar archivos `?` |
| S02 | Editor de documento | anotar PDF e imágenes |
| S03 | Barra de herramientas | texto, subrayado, dibujo, formas, regla, transportador, medios |
| S04 | Banco de anotaciones | guardar y reutilizar comentarios |
| S05 | Comentario de voz / vídeo / captura | feedback multimedia |
| S06 | Crear tarea (Classroom) | elegir documento, restringir herramientas |
| S07 | Vista de clase (Class View) | ver el trabajo de todos los alumnos |
| S08 | Herramienta de preguntas | preguntas en el documento |
| S09 | Tarea del alumno | abrir, trabajar, entregar |
| S10 | Calificación | nota y feedback |
| S11 | Ajustes / plan / facturación `?` | cuenta y licencias |

## Flujos
- F01 Alumno abre tarea desde Classroom, anota y entrega: S09 -> S02 -> entrega
- F02 Profesor crea tarea con herramientas restringidas: S06 -> Classroom
- F03 Profesor revisa la clase y califica: S07 -> S02 -> S10
- F04 Profesor da feedback con voz/vídeo y banco de anotaciones: S02 -> S05/S04
- F05 Usuario sube un PDF y lo anota solo: S01 -> S02 -> exportar `?`

## Modelo de datos inferido (confianza baja)
User, Organization, Class (de Classroom), Document (PDF + versiones),
Annotation (tipo, página, coordenadas, autor, estilo), Assignment
(restricciones de herramientas), Submission, Grade, BankItem, MediaComment.

## Fuera de alcance (skip)
Marca, logos y textos de Kami; extensión oficial en la Chrome Web Store como
producto copiado (se construye propia); datos de sus usuarios.

## Partes difíciles
1. Renderizado y edición de PDF en el navegador (PDF.js + capa de anotaciones)
2. Colaboración en tiempo real
3. Integración Google Classroom (OAuth, verificación de Google, API de Classroom)
4. Voz, vídeo y captura de pantalla
5. Exportar un PDF con las anotaciones incrustadas
Integraciones Canvas, Schoology y Teams: ampliación futura.
