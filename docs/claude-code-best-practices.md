# Claude Code — Best Practices

Guia de buenas practicas para trabajar con Claude Code de forma eficiente y profesional. Basada en la [documentacion oficial](https://code.claude.com/docs/en/best-practices), [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) (135k stars), y experiencia propia.

---

## 1. Context Management

El contexto es el recurso mas importante. El rendimiento de Claude degrada a medida que se llena.

### Presupuesto de contexto por feature

| Feature | Cuando carga | Coste de contexto |
|---------|-------------|-------------------|
| **CLAUDE.md** | Inicio de sesion | Cada request (mantener < 200 lineas) |
| **Rules** (`.claude/rules/`) | Inicio de sesion | Cada request (mantener concisas) |
| **Skills** (descripciones) | Inicio de sesion | ~2% del contexto (solo nombres + descripciones) |
| **Skills** (contenido completo) | Al invocar | Solo cuando se usa (progressive disclosure) |
| **Subagentes** | Al crear | Contexto aislado (no consume el principal) |
| **Hooks** | Al dispararse | Zero (scripts externos) |

### Reglas de oro

- **`/clear`** entre tareas no relacionadas. Contexto irrelevante = peor rendimiento.
- **`/compact`** manual al ~50% de contexto. No esperar al auto-compact (se activa al ~95%).
- **`/compact <instrucciones>`** para dirigir que preservar: `/compact Focus on the API changes`.
- **Subagentes** para aislar exploracion. La busqueda en un subagente no contamina tu contexto principal.
- **`/btw`** para preguntas rapidas sin contaminar contexto (aparece como overlay, no entra en historial).
- **`/context`** para monitorear uso de contexto.
- **`/usage`** para ver limites del plan.

### CLAUDE.md eficiente

- Mantener bajo 200 lineas. Si crece, mover a `.claude/rules/` o skills.
- Solo incluir lo que Claude NO puede inferir del codigo.
- Usar `@path` imports para cargar contenido bajo demanda.
- Para cada linea preguntarse: _"Si elimino esto, Claude cometeria errores?"_ Si no, eliminarlo.
- Usar enfasis ("IMPORTANT", "YOU MUST") para reglas criticas.
- Hacer commit y compartir con el equipo.

### Skills vs Rules vs CLAUDE.md

| Uso | Donde |
|-----|-------|
| "Siempre haz X" | CLAUDE.md |
| Convenciones por lenguaje/directorio | `.claude/rules/` |
| Conocimiento bajo demanda, workflows invocables | Skills |

---

## 2. Session Workflow

### Patron RPI: Research -> Plan -> Implement

1. **Research** (Plan Mode): Claude lee archivos y responde preguntas sin hacer cambios.
2. **Plan**: Pedir plan detallado. `Ctrl+G` para editar el plan en tu editor.
3. **Implement** (Normal Mode): Claude implementa verificando contra su plan.
4. **Commit**: Pedir commit con mensaje descriptivo.

### Gestion de sesiones

- **`/rename`** para etiquetar sesiones: `"oauth-migration"`, `"debugging-memory-leak"`.
- **`claude --continue`** para retomar la sesion mas reciente.
- **`claude --resume`** para elegir entre sesiones recientes.
- **Commit al menos cada hora** para trackear progreso.

### Correccion de rumbo

- **`Esc`**: parar a Claude a mitad de accion. El contexto se preserva.
- **`Esc + Esc`** o **`/rewind`**: abrir menu de rewind para restaurar estado anterior.
- **`"Undo that"`**: pedir a Claude que revierta sus cambios.
- Si corriges a Claude **mas de 2 veces** en lo mismo: `/clear` y reescribir un prompt mejor.

---

## 3. Agent Design Patterns

### Patron: Personality + Router

Los agentes deben ser delgados (~50-80 lineas):
- **Personalidad**: quien es, que sabe hacer
- **Tabla de routing**: que skill usar para cada tarea
- **Reglas clave**: resumidas, no detalladas
- **Rutas del proyecto**: donde estan los archivos relevantes

El detalle va en los skills (carga bajo demanda = **progressive disclosure**).

### Cuando usar subagentes

| Situacion | Usar |
|-----------|------|
| Tarea produce mucho output (tests, logs, exploracion) | Subagente (aislamiento) |
| Trabajo autocontenido que devuelve un resumen | Subagente |
| Investigaciones paralelas independientes | Multiples subagentes |
| Interaccion iterativa con feedback frecuente | Conversacion principal |
| Cambio rapido y dirigido | Conversacion principal |

### Memory field

Los agentes pueden tener `memory: project` para aprendizaje cross-session. El subagente acumula conocimiento en `.claude/agent-memory/<name>/` que persiste entre conversaciones.

### Tool restrictions

Limitar herramientas por seguridad y foco:
- Agentes de revision: solo `Read, Grep, Glob` (sin Write/Edit)
- Agentes de verificacion: solo `Bash`
- Agentes completos: todas las herramientas

---

## 4. Skill Design Patterns

### Tipos de skills

| Tipo | `user-invocable` | `disable-model-invocation` | Ejemplo |
|------|-------------------|---------------------------|---------|
| Workflow manual | `true` | `true` | `/deploy`, `/verify` |
| Conocimiento bajo demanda | `true` (default) | `false` (default) | `/new-aggregate` |
| Background knowledge | `false` | `false` | `event-design` |

### Frontmatter clave

```yaml
---
name: my-skill
description: Que hace y CUANDO usarlo (ser especifico)
user-invocable: true          # Aparece en menu /
disable-model-invocation: true # Solo el usuario lo invoca
allowed-tools: Bash, Read      # Restringir herramientas
context: fork                  # Ejecutar en subagente aislado
agent: Explore                 # Tipo de subagente para context: fork
---
```

### Estructura de archivos

```
my-skill/
  SKILL.md           # Instrucciones principales (< 500 lineas)
  references/        # Docs detallados (carga bajo demanda)
  scripts/           # Scripts ejecutables
  assets/            # Templates, iconos
```

### Patron Command -> Agent -> Skill

```
/new-feature BusStop
  -> Command (skill user-invocable, entry point determinista)
    -> Agent (domain-expert, orquesta el trabajo)
      -> Skill (new-aggregate, genera los archivos)
```

### Descripciones efectivas

La descripcion es el mecanismo principal de triggering. Incluir:
- QUE hace el skill
- CUANDO usarlo (contextos especificos)
- Ser un poco "pushy" (Claude tiende a sub-triggear)

Malo: `"Format data"`
Bueno: `"Format CSV data into domain entities. Use when importing data, processing CSV files, or converting external formats to domain objects."`

---

## 5. Debugging & Verification

### Quality gate

Usar `/verify` como quality gate antes de cada commit:
1. Format check (Prettier)
2. Type check (tsc)
3. Lint (ESLint + hexagonal rules)
4. Tests (bun test)

### Cross-model review

Usar un modelo diferente para revisar codigo:
- Session A (Writer): implementa con el modelo habitual
- Session B (Reviewer): revisa con otro modelo o contexto fresco

Un contexto fresco mejora la revision porque Claude no esta sesgado hacia codigo que acaba de escribir.

### Monitoring

- **`/loop 5m /verify`**: ejecutar verificacion cada 5 minutos durante desarrollo activo.
- **`/loop 10m check deploy status`**: monitorear despliegues.

### Debugging tips

- Pegar screenshots directamente en el prompt para bugs de UI.
- Usar `cat error.log | claude` para enviar logs directamente.
- Usar MCP tools (Playwright, Chrome DevTools) para visibilidad de logs en browser.
- **`/doctor`** para diagnosticar problemas de Claude Code.

---

## 6. Skill-Creator

### Que es

Herramienta oficial de Anthropic ([github.com/anthropics/skills](https://github.com/anthropics/skills)) para crear, testear, benchmarkear y optimizar skills.

### Workflow

1. **Draft**: escribir SKILL.md inicial
2. **Test prompts**: crear 2-3 prompts realistas
3. **Eval**: ejecutar prompts con y sin skill, comparar resultados
4. **Review**: usar eval-viewer para revision cualitativa + benchmarks cuantitativos
5. **Iterate**: mejorar skill basandose en feedback
6. **Description optimization**: optimizar descripcion para mejor triggering

### Cuando usarlo

- Al crear skills complejos que necesitan refinamiento iterativo
- Cuando un skill no triggerea correctamente (optimizar descripcion)
- Para benchmarkear rendimiento de skills existentes

### Como instalar

Disponible como plugin de Claude Code o clonable desde el repo. Para uso basico, el workflow manual (draft -> test -> iterate) es suficiente.

---

## 7. Anti-patterns

### The Kitchen Sink Session
Empezar con una tarea, preguntar algo no relacionado, volver a la primera. Contexto lleno de ruido.
**Fix**: `/clear` entre tareas no relacionadas.

### Correcting Over and Over
Claude falla, corriges, sigue fallando, corriges de nuevo. Contexto contaminado con intentos fallidos.
**Fix**: Despues de 2 correcciones fallidas, `/clear` y escribir un prompt mejor con lo aprendido.

### The Over-specified CLAUDE.md
CLAUDE.md demasiado largo -> Claude ignora la mitad porque las reglas importantes se pierden en el ruido.
**Fix**: Podar sin piedad. Si Claude ya lo hace bien sin la instruccion, eliminarla.

### The Trust-then-Verify Gap
Claude produce implementacion que parece correcta pero no maneja edge cases.
**Fix**: Siempre proporcionar verificacion (tests, scripts, screenshots).

### The Infinite Exploration
Pedir a Claude "investigar" algo sin acotar. Claude lee cientos de archivos llenando el contexto.
**Fix**: Acotar investigaciones o usar subagentes para que la exploracion no consuma el contexto principal.

---

## 8. Tips Rapidos

- Usar `@` para referenciar archivos en prompts en vez de describir donde estan.
- Pegar imagenes directamente (drag & drop o copy/paste).
- Dar URLs de documentacion. Usar `/permissions` para allowlistear dominios frecuentes.
- Dejar que Claude obtenga contexto el mismo: "lee los tests existentes y sigue el patron".
- Preguntar a Claude lo que preguntarias a un ingeniero senior del equipo.
- Para features grandes: "Entrevistame en detalle usando AskUserQuestion" -> genera spec -> sesion fresca para implementar.
