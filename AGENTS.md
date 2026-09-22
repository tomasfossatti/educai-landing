# AGENTS.md

Antes de modificar Educai, inspeccioná primero la implementación existente y reutilizá la arquitectura actual siempre que sea razonable.

Para cambios relacionados con UX, analytics pedagógicos, insights, intervenciones, privacidad, conceptos o RAG, consultar `docs/EDUCAI_REDESIGN_SPEC.md` antes de modificar código.

Usá también `docs/ARCHITECTURE.md`, `docs/AI_BEHAVIOR.md`, `docs/MVP_SPEC.md` y `docs/PRODUCT_DECISIONS.md` como contexto del estado actual. Ante diferencias entre documentación y código, verificá el comportamiento real antes de implementar.

Reglas permanentes:

- No crear sistemas paralelos para capacidades que ya existan.
- Preservar privacidad y analítica agregada; no introducir vigilancia individual del estudiante.
- Contar participantes independientes, no volumen bruto de mensajes, para evidencia grupal.
- No presentar señales o comparaciones antes/después como diagnósticos o causalidad demostrada.
- No convertir Educai en un LMS completo, sistema de grading, proctoring o suite genérica de herramientas de IA.
- Hacer cambios incrementales, con migraciones no destructivas y tests sobre lógica crítica.
