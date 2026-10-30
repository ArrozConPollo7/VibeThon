# Convenciones del proyecto

- Identidad de commits: `ArrozConPollo7 <juandavidgr39@gmail.com>`.
- Commits en español, imperativo, con alcance: `feat(api): ...`, `fix(ui): ...`.
- Sin secretos en el repo: usar `.env` local y `.env.example` versionado.
- Ramas: `main` estable, trabajo en `feat/<tema>`.
- Cada decisión de arquitectura relevante se anota en `docs/`.

## Protocolo entre IAs

- **Claude** (arquitecto/revisor): escribe tareas en `docs/TAREA_XX_*.md` y revisa resultados.
- **Hermes / DeepSeek** (implementador): ejecuta la tarea, reporta en `docs/STATUS.md`.
- **Stitch** (diseño): exportaciones HTML en `design/`.
- Dudas: `docs/PREGUNTAS.md`. Registro de prompts: `docs/PROMPTS.md`.
- No cambiar contratos de API definidos en una tarea sin anotarlo en STATUS.md.
