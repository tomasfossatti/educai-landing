# EDUCAI — ESPECIFICACIÓN DE IMPLEMENTACIÓN DEL REDISEÑO DE PRODUCTO

## 1. Objetivo

Modificar el producto existente de Educai para reforzar su loop central:

**contenido docente → estudio con IA → conversaciones → señales → patrones → insight → decisión docente → intervención → feedback → nueva evidencia**

Educai no debe convertirse en un LMS, una plataforma de evaluación automática ni un sistema de vigilancia estudiantil.

El producto debe profundizar su propuesta principal: **transformar conversaciones privadas de estudio en inteligencia pedagógica agregada, confiable y accionable para docentes.**

Educai ya tiene implementados tutor conversacional, RAG, análisis estructurado, conceptos, señales, pseudonimización, agregación por participante, estados de evidencia, insights, recomendaciones, intervenciones, sesiones, feedback y comparación pre/post.

Por lo tanto, gran parte del trabajo consiste en **reorganizar y profundizar capacidades existentes**, no en crear subsistemas independientes.

---

# 2. Principios que no deben romperse

Toda implementación debe respetar estas restricciones.

## 2.1. No mostrar analítica individual al docente

El docente no debe acceder a:

- historial de conversaciones identificables;
- perfiles cognitivos individuales;
- rankings;
- scores de comprensión por estudiante;
- alumnos “en riesgo” generados automáticamente;
- diagnósticos individuales.

El sistema debe transformar:

**identidad → conversación → análisis → pseudonimización → agregación → insight grupal**

antes de que la información llegue al docente.

## 2.2. Contar participantes, no mensajes

Una conversación muy intensa de un único estudiante no debe convertirse en evidencia grupal.

Los insights deben considerar **participantes independientes** como unidad principal de agregación.

## 2.3. No presentar inferencias como certezas

Usar lenguaje como:

- “aparecen señales”;
- “se observa una dificultad recurrente”;
- “la evidencia disponible sugiere”;
- “se detectaron menos señales”.

Evitar:

- “los alumnos no entienden”;
- “esta intervención funcionó”;
- “Educai comprobó que…”.

Educai detecta evidencia, no estados mentales definitivos.

## 2.4. No afirmar causalidad

Una reducción de señales después de una intervención debe mostrarse como:

**cambio observado antes/después**

y nunca como:

**impacto causado por la intervención**.

## 2.5. Preservar `NO_DATA`, `INSUFFICIENT` y `SUFFICIENT`

Los estados actuales de evidencia son parte importante de la confianza del sistema.

No convertir ausencia de datos en cero ni ocultar evidencia insuficiente.

---

# 3. Cambios a implementar

Implementar siete líneas de trabajo:

1. Insight verificable.
2. Dashboard “Qué cambió”.
3. Intervention Loop.
4. Privacy Contract.
5. Study Starters.
6. Concept Intelligence y clustering.
7. Mejora de retrieval + provenance.

Deben sentirse como partes de un mismo sistema.

---

# 4. FEATURE 1 — Insight verificable

## Problema actual

El sistema ya genera insights, evidencia y recomendaciones.

Sin embargo, el docente necesita comprender rápidamente:

1. qué está ocurriendo;
2. por qué Educai cree que está ocurriendo;
3. qué tan sólida es la evidencia;
4. qué podría hacer al respecto.

La nueva experiencia debe convertir esto en una unidad de decisión.

## Nueva tarjeta de insight

Cada `InsightCard` debe contener:

### Encabezado

- concepto;
- estado;
- tendencia;
- cantidad de participantes independientes.

Ejemplo:

**Correlación vs. causalidad**

`7 de 18 participantes`  
`Evidencia suficiente`  
`↑ En aumento`

### Resumen

Descripción breve del patrón.

Ejemplo:

> Aparecen dificultades recurrentes para diferenciar correlación de causalidad.

### Evidencia

Mostrar inicialmente solo un resumen.

Permitir expandir:

**¿Por qué Educai muestra esto?**

Debe mostrar:

- participantes independientes;
- señales totales;
- reformulaciones;
- primera detección;
- última detección;
- cantidad de sesiones en las que apareció;
- ejemplos anonimizados representativos.

Los ejemplos solo pueden mostrarse cuando el estado de evidencia permita exposición agregada.

### Acción

Mostrar una recomendación concreta.

Botones principales:

- `Trabajar este tema`
- `Ver evidencia`

Acciones secundarias:

- `No representa el problema`
- `Cambiar concepto`
- `Descartar`

---

# 5. Modelo de datos para insights

Revisar primero el schema existente.

No duplicar campos que ya existan.

Extender `AggregatedInsight` o equivalente con lo necesario para soportar:

```ts
firstDetectedAt
lastDetectedAt
independentParticipantCount
signalCount
reformulationCount
trend
teacherStatus
```

Enums recomendados:

```ts
enum InsightTrend {
  NEW
  RISING
  STABLE
  FALLING
}
```

```ts
enum TeacherInsightStatus {
  OPEN
  ACKNOWLEDGED
  ACTION_PLANNED
  DISMISSED
  RESOLVED
  MONITORING
}
```

No crear un `AIConfidenceScore` numérico arbitrario.

La confianza debe explicarse mediante evidencia observable.

---

# 6. FEATURE 2 — Dashboard “Qué cambió”

## Objetivo

Rediseñar la home docente.

La pantalla principal no debe funcionar como un dashboard analítico genérico.

Debe responder:

> **¿Qué cambió desde la última vez que di clase?**

## Estructura de la home

### Sección principal

**Antes de tu próxima clase**

Mostrar únicamente los elementos más relevantes.

Categorías:

### Nuevo

Conceptos que no tenían evidencia grupal y ahora sí.

### En aumento

Conceptos donde aumentó de manera relevante la cantidad de participantes independientes.

### Persistente

Conceptos que siguen apareciendo durante varias sesiones.

### En descenso

Conceptos con reducción de señales.

### Sin cambios relevantes

Colapsado por defecto.

## Ejemplo

### 3 cosas requieren atención

**NUEVO**

### Derivadas

5 participantes muestran señales recientes de dificultad.

---

**PERSISTENTE**

### Correlación vs. causalidad

7 participantes · presente en 3 sesiones.

---

**EN DESCENSO**

### Distribución normal

6 → 2 participantes con señales recientes.

---

# 7. Implementación temporal

Crear snapshots por concepto y sesión.

Ejemplo conceptual:

```ts
ConceptSnapshot {
  id
  courseId
  conceptId
  sessionId
  participantCount
  signalCount
  evidenceState
  createdAt
}
```

Generar el snapshot:

- al cerrar una sesión;
- o mediante un proceso de agregación equivalente ya existente.

Comparar:

```text
snapshot actual
vs
snapshot anterior
```

Reglas V1 simples.

No introducir ML todavía.

Ejemplo:

```text
0 → >= threshold = NEW

incremento relevante = RISING

variación pequeña = STABLE

descenso relevante = FALLING
```

Los thresholds deben vivir en configuración o funciones centralizadas, no hardcodeados en componentes de UI.

---

# 8. FEATURE 3 — Intervention Loop

## Problema

Actualmente las siguientes entidades existen pero pueden sentirse separadas:

- Insight
- Recommendation
- TeacherIntervention
- ClassSession
- ClassFeedback

Deben convertirse en un único workflow.

## Flujo esperado

```text
INSIGHT
↓
RECOMMENDATION
↓
DOCENTE DECIDE
↓
INTERVENTION PLANNED
↓
CLASS SESSION
↓
INTERVENTION APPLIED
↓
FEEDBACK + NEW CONVERSATIONS
↓
NEW SIGNALS
↓
BEFORE / AFTER COMPARISON
```

## UX

Dentro de un insight:

### Acción sugerida

> Comparar dos ejemplos donde exista correlación pero no causalidad.

CTA:

`Usar esta intervención`

El docente puede:

- aceptar;
- editar;
- escribir una intervención propia.

Después:

### Intervención planificada

Mostrarla en:

**Próxima clase**

Ejemplo:

> Correlación vs causalidad  
> Comparar dos casos contrastantes.

## Después de la sesión

Mostrar:

### Qué ocurrió después

**Antes**

7 participantes con señales relacionadas.

**Después**

3 participantes con señales relacionadas.

`↓ Se detectan menos señales`

Texto obligatorio:

> Este resultado representa un cambio observado. No demuestra que la intervención haya causado el cambio.

---

# 9. Modelo de intervención

Revisar primero `TeacherIntervention`.

Agregar solo si no existen:

```ts
sourceRecommendationId?: string
conceptId: string
status
plannedAt?
appliedAt?
sessionId?
```

Enum:

```ts
enum InterventionStatus {
  PLANNED
  APPLIED
  SKIPPED
}
```

Debe ser posible asociar:

```text
AggregatedInsight
→ Recommendation
→ TeacherIntervention
→ ClassSession
```

---

# 10. Reducir fricción

Registrar una intervención debe requerir como máximo:

1. seleccionar recomendación;
2. confirmar o editar.

No exigir formularios largos.

Educai debe reducir trabajo docente, no generar documentación administrativa adicional.

---

# 11. FEATURE 4 — Privacy Contract

## Objetivo

Hacer visible la arquitectura de privacidad para el estudiante.

La privacidad no debe ser únicamente política legal.

Debe formar parte de la experiencia.

## Primer ingreso al tutor

Antes de la primera conversación mostrar una pantalla/modal breve.

Texto conceptual:

### Este es tu espacio de estudio

Podés preguntar libremente.

Tu docente no recibe un historial individual de tus conversaciones.

Educai analiza señales de aprendizaje y muestra patrones únicamente cuando existe evidencia suficiente entre varias personas.

Si eliminás una conversación, también se eliminan las señales derivadas de ella.

CTA:

`Entendido, empezar a estudiar`

## Persistencia

Agregar si no existe:

```ts
privacyNoticeVersion
privacyNoticeAcceptedAt
```

El usuario no debe aceptar nuevamente mientras la versión no cambie.

Agregar dentro del tutor:

`Cómo usa Educai mis conversaciones`

La explicación debe ser accesible posteriormente.

---

# 12. FEATURE 5 — Study Starters

## Problema

Una caja de chat vacía genera fricción.

El alumno puede no saber qué preguntar.

## UX

En una conversación nueva mostrar:

### ¿Cómo querés estudiar esto?

Botones:

- `Explicámelo`
- `Dame un ejemplo`
- `Compará conceptos`
- `Haceme preguntas`
- `Ayudame a encontrar qué no entiendo`

Debe continuar existiendo el input libre.

Los starters nunca deben ser obligatorios.

## Comportamiento

Al seleccionar:

`Dame un ejemplo`

el sistema puede generar internamente un mensaje como:

> Dame un ejemplo que me ayude a comprender mejor el contenido de esta actividad.

Debe pasar por el mismo pipeline RAG del chat normal.

## Datos

Opcionalmente registrar:

```ts
enum StudyIntent {
  EXPLAIN
  EXAMPLE
  COMPARE
  PRACTICE
  DIAGNOSE
  FREEFORM
}
```

Asociarlo a conversación o mensaje inicial.

No mostrar todavía este dato al docente como analítica individual.

Puede servir posteriormente como señal agregada.

---

# 13. FEATURE 6 — Concept Intelligence

## Problema

El sistema puede detectar múltiples nombres para un mismo concepto.

Ejemplo:

```text
correlación vs causalidad
causalidad y correlación
confusión correlacional
relación causal
```

Si cada uno se transforma en un concepto diferente:

- la evidencia se fragmenta;
- disminuye el número de participantes por concepto;
- aparecen falsos `INSUFFICIENT`;
- se generan insights duplicados.

---

# 14. Nuevo pipeline de conceptos

Cambiar:

```text
ConversationAnalysis
↓
Concept
↓
ConceptSignal
```

por:

```text
ConversationAnalysis
↓
candidate concept
↓
normalization
↓
similarity search
↓
match existing concept
OR
create concept
↓
ConceptSignal
```

---

# 15. Alias

Agregar:

```ts
ConceptAlias {
  id
  conceptId
  label
  normalizedLabel
  source
  similarity?
  createdAt
}
```

Posibles `source`:

```text
AI
TEACHER
SYSTEM
```

---

# 16. Concept Relations

Opcional para primera versión, pero diseñar para permitir:

```ts
ConceptRelation {
  sourceConceptId
  targetConceptId
  type
}
```

Tipos posibles:

```text
RELATED
PREREQUISITE
POSSIBLE_DUPLICATE
```

---

# 17. Curación docente

Si Educai detecta alta probabilidad de duplicado:

> Estos conceptos podrían representar el mismo tema.

Mostrar:

**Correlación y causalidad**

Posibles equivalentes:

- causalidad vs correlación;
- relación causal.

Acciones:

`Fusionar`

`Mantener separados`

`Renombrar`

No pedir al docente revisar todos los conceptos.

Solo mostrar casos ambiguos con impacto real sobre insights.

---

# 18. Merge

Al fusionar conceptos:

1. mover alias;
2. reasignar `ConceptSignal`;
3. actualizar insights relacionados;
4. recalcular participantes independientes;
5. recalcular estado de evidencia;
6. preservar auditoría del merge.

No borrar silenciosamente el concepto anterior.

Idealmente conservar:

```ts
mergedIntoConceptId
mergedAt
```

o historial equivalente.

---

# 19. FEATURE 7 — Mejorar RAG

## Problema

Actualmente la recuperación es principalmente lexical.

Esto puede contaminar todo el pipeline.

Ejemplo:

```text
retrieval incorrecto
↓
respuesta incorrecta
↓
confusión del alumno
↓
señal detectada
↓
insight incorrecto
```

Por eso la calidad del retrieval afecta directamente la calidad de analytics.

---

# 20. V1 de Hybrid Retrieval

No reemplazar inmediatamente todo el sistema.

Implementar:

```text
query
↓
lexical search
+
semantic search
↓
merge candidates
↓
ranking
↓
top chunks
↓
LLM
```

Si el producto ya usa PostgreSQL, evaluar `pgvector`.

No introducir una nueva base vectorial externa salvo que exista una razón técnica clara.

---

# 21. Embeddings

Para cada `ContentChunk`:

```ts
embedding
embeddingModel
embeddedAt
```

Cuando:

- se crea material;
- cambia una versión;
- pasa a ACTIVE;

generar embeddings correspondientes.

Los contenidos `RETIRED` no deben utilizarse en retrieval activo.

---

# 22. Provenance

Cada respuesta del tutor debe mantener trazabilidad de los chunks recuperados.

Si no existe una entidad específica, crear algo equivalente a:

```ts
MessageSource {
  id
  messageId
  contentChunkId
  retrievalMethod
  retrievalScore
  rank
}
```

`retrievalMethod`:

```text
LEXICAL
SEMANTIC
HYBRID
```

No guardar únicamente las fuentes que finalmente se muestran.

Guardar también la trazabilidad necesaria para auditoría y debugging.

---

# 23. UI de fuentes

Dentro de la respuesta del tutor:

`Fuentes`

Ejemplo:

> Unidad 3 · página 18  
> Material “Introducción a causalidad”

No mostrar scores técnicos.

El objetivo es generar confianza y permitir al alumno volver al material original.

---

# 24. Nueva arquitectura UX docente

La navegación docente debe reorganizarse alrededor de decisiones.

## Home

```text
Qué cambió
```

Debe ser la entrada principal.

## Insight detail

```text
Qué ocurre
↓
Qué evidencia existe
↓
Qué podría hacer
```

## Intervention

```text
Qué voy a hacer
```

## Session

```text
Qué hice
```

## Result

```text
Qué observamos después
```

El producto no debe obligar al docente a pensar en entidades técnicas como:

- signals;
- snapshots;
- analysis;
- aggregates.

Esos términos pertenecen al sistema interno.

---

# 25. Nueva arquitectura UX estudiante

```text
Course
↓
Activity
↓
Study Starters
↓
Tutor
↓
Conversation
```

Dentro del tutor:

- contexto claro de actividad;
- input libre;
- starters en conversaciones nuevas;
- fuentes;
- historial;
- eliminar conversación;
- acceso a explicación de privacidad.

No mostrar:

- signals;
- analyses;
- evidence state;
- participant counts.

Esas son capacidades internas/docentes.

---

# 26. Procesamiento de conversaciones

Mantener el pipeline conceptual actual:

```text
Message
↓
ConversationAnalysis
↓
Concept candidate
↓
Concept resolution
↓
ConceptSignal
↓
Participant pseudonym
↓
Aggregation
↓
Evidence state
↓
AggregatedInsight
↓
Recommendation
```

Agregar después:

```text
Teacher decision
↓
TeacherIntervention
↓
ClassSession
↓
new evidence
↓
ConceptSnapshot
↓
Trend
```

---

# 27. No mezclar análisis con request del chat

Actualmente el análisis puede ejecutarse de manera síncrona.

Si el refactor hace posible separar responsabilidades:

```text
POST message
↓
respond tutor
↓
persist
↓
enqueue analysis
```

sería preferible.

Pero no introducir infraestructura de colas compleja si no es necesaria para implementar este ciclo.

Priorizar arquitectura limpia sobre premature scaling.

---

# 28. Pantallas a modificar

Como mínimo revisar:

## Student

- entrada a actividad;
- conversación nueva;
- chat;
- fuentes;
- historial;
- eliminación de conversación;
- privacidad.

## Teacher

- home/dashboard;
- insights list;
- insight detail;
- recommendation;
- intervention;
- session;
- feedback;
- before/after comparison;
- concept management.

---

# 29. Componentes sugeridos

No seguir estos nombres si la arquitectura existente utiliza otra convención.

Conceptualmente deberían existir componentes equivalentes a:

```text
TeacherHome
ChangeSummary
InsightCard
InsightEvidencePanel
EvidenceStateBadge
TrendBadge
RecommendationCard
PlanInterventionButton
InterventionCard
BeforeAfterComparison
ConceptMergeSuggestion
StudyStarterGrid
PrivacyNotice
SourceCitation
```

Priorizar reutilización.

No crear componentes monolíticos de cientos de líneas.

---

# 30. Backend services sugeridos

Separar responsabilidades conceptuales.

Ejemplo:

```text
conversationAnalysisService
conceptResolutionService
signalAggregationService
insightGenerationService
trendService
recommendationService
interventionService
retrievalService
privacyDeletionService
```

No es obligatorio crear exactamente estos archivos.

El objetivo es evitar que toda la lógica termine mezclada dentro de API routes o server actions.

---

# 31. Eliminación de conversaciones

Este flujo es crítico.

Cuando un alumno elimina una conversación:

```text
Conversation
↓ delete
Messages
↓ delete
ConversationAnalysis
↓ delete
ConceptSignals derived from conversation
↓ delete
recompute AggregatedInsights
↓
recompute ConceptSnapshots / trends where necessary
```

Nunca mantener una señal agregada derivada exclusivamente de información que el estudiante eliminó.

---

# 32. Migraciones

Antes de modificar Prisma:

1. inspeccionar schema actual;
2. identificar campos equivalentes;
3. evitar tablas duplicadas;
4. diseñar migración incremental;
5. preservar datos existentes.

No hacer `db push` destructivo en producción.

Usar migraciones Prisma versionadas.

---

# 33. Backfill

Si se agregan:

- `firstDetectedAt`;
- snapshots;
- aliases;
- embeddings;
- trends;

definir explícitamente si los datos históricos pueden ser reconstruidos.

Preferencias:

### Puede reconstruirse con seguridad

Hacer backfill.

### No puede reconstruirse

Dejar `null` y comenzar desde la nueva versión.

No inventar históricos.

---

# 34. Orden de implementación

Implementar en este orden.

## Fase 1 — UX sobre infraestructura actual

1. Privacy Contract.
2. Study Starters.
3. Insight verificable.
4. Intervention Loop.

Objetivo:

obtener valor visible sin cambiar profundamente analytics.

## Fase 2 — Temporal intelligence

5. ConceptSnapshot.
6. Trend calculation.
7. Dashboard “Qué cambió”.
8. Before/after integrado.

## Fase 3 — Calidad de señales

9. ConceptAlias.
10. Concept normalization.
11. Duplicate detection.
12. Teacher merge/split flow.

## Fase 4 — Retrieval

13. embeddings;
14. hybrid retrieval;
15. provenance;
16. fuentes visibles.

---

# 35. Criterios de aceptación globales

La implementación estará completa cuando pueda ejecutarse este escenario:

### 1.

Docente crea una materia.

### 2.

Carga contenido y lo activa.

### 3.

Crea una actividad.

### 4.

Alumno entra.

### 5.

Ve el Privacy Contract.

### 6.

Elige un Study Starter o escribe libremente.

### 7.

El tutor responde utilizando contenido validado.

### 8.

La respuesta conserva provenance.

### 9.

Las conversaciones producen análisis estructurado.

### 10.

Los conceptos similares se normalizan correctamente.

### 11.

Las señales se agregan por participante independiente.

### 12.

Con evidencia suficiente aparece un insight.

### 13.

El docente puede comprender:

- qué ocurre;
- cuánta evidencia existe;
- qué cambió;
- por qué Educai lo muestra.

### 14.

Educai propone una acción.

### 15.

El docente puede convertirla en intervención.

### 16.

La intervención se asocia a una sesión.

### 17.

Después aparecen nuevas señales.

### 18.

Educai compara antes/después.

### 19.

La UI describe únicamente cambio observado, no causalidad.

### 20.

El docente nunca necesita ver conversaciones identificables.

---

# 36. Tests obligatorios

Agregar tests especialmente sobre lógica crítica.

## Privacy

- no mostrar evidencia con `INSUFFICIENT`;
- no exponer IDs de estudiantes;
- eliminar conversación elimina señales derivadas;
- recalcular insights después de eliminación.

## Aggregation

- 10 mensajes de una persona cuentan como 1 participante;
- 3 participantes distintos permiten llegar al threshold actual;
- aliases fusionados no duplican participantes.

## Concepts

- merge conserva señales;
- merge recalcula insight;
- split no pierde evidencia.

## Trends

- NEW correcto;
- RISING correcto;
- STABLE correcto;
- FALLING correcto;
- `NO_DATA` no interpretado como mejora.

## Intervention

- recommendation → intervention;
- intervention → session;
- comparison solo usa ventanas correspondientes.

## RAG

- materiales `DRAFT` no utilizados;
- materiales `RETIRED` no utilizados;
- únicamente `ACTIVE`;
- provenance relacionado con respuesta;
- búsqueda lexical sigue funcionando como fallback.

---

# 37. Observabilidad

Agregar logging estructurado para errores en:

- parsing de análisis IA;
- concept resolution;
- embeddings;
- retrieval;
- generation de insight;
- recommendation;
- snapshot creation;
- trend calculation;
- recalculation después de deletion.

Nunca loggear conversaciones completas en producción salvo que la arquitectura y política de privacidad existente lo permitan explícitamente.

Preferir IDs internos y metadata técnica.

---

# 38. Métricas de producto

Instrumentar, si existe analytics:

## Alumno

```text
activity_opened
privacy_notice_seen
privacy_notice_accepted
study_starter_selected
conversation_started
message_sent
source_opened
conversation_deleted
```

## Docente

```text
teacher_home_opened
insight_opened
evidence_expanded
recommendation_viewed
intervention_planned
intervention_applied
before_after_viewed
concept_merge_accepted
concept_merge_rejected
```

No crear métricas individuales sobre “capacidad”, “inteligencia” o “riesgo”.

---

# 39. Qué NO implementar

No agregar durante este trabajo:

- calificaciones automáticas;
- gradebook;
- generación de notas;
- perfiles individuales de aprendizaje;
- ranking de alumnos;
- risk scores;
- cheating detection;
- plagiarism detection;
- proctoring;
- chat completo visible al docente;
- gamificación;
- badges;
- streaks;
- LMS completo;
- calendario académico;
- attendance;
- herramientas administrativas institucionales;
- decenas de herramientas IA docentes;
- agentes autónomos que tomen decisiones pedagógicas.

---

# 40. Definición de producto resultante

Cuando termine esta implementación, Educai debería sentirse así:

## Para el alumno

> Tengo un tutor basado en el contenido real de mi materia. Puedo preguntar con libertad, tengo ayuda para empezar y puedo saber de dónde vienen las respuestas. Mi docente no recibe un expediente de mis conversaciones.

## Para el docente

> No necesito leer chats ni mirar dashboards complejos. Educai me muestra qué dificultades están apareciendo en mi clase, qué cambió desde la última vez, qué evidencia sostiene cada patrón y qué podría hacer. Puedo actuar y luego observar qué ocurrió después.

## Para Educai

El producto deja de ser:

> tutor IA + dashboard

y pasa a comportarse como:

> **sistema continuo de inteligencia pedagógica colectiva.**

Su unidad de valor deja de ser una conversación o un insight aislado.

La unidad de valor es:

**evidencia → comprensión → decisión → intervención → nueva evidencia.**

Ese loop debe convertirse en la arquitectura principal del producto y de su experiencia.
