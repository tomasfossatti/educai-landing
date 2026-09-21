"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, Plus, Search, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Role = "TEACHER" | "STUDENT" | null;
type Item = { label: string; description: string; href: string; icon: React.ReactNode };

export function EducaiSpotlight({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  const items = useMemo<Item[]>(() => role === "TEACHER" ? [
    { label: "Mis cursos", description: "Volver al panel docente", href: "/teacher", icon: <BookOpen/> },
    { label: "Crear curso", description: "Preparar un nuevo espacio de aprendizaje", href: "/teacher/courses/new", icon: <Plus/> },
  ] : role === "STUDENT" ? [
    { label: "Mis cursos", description: "Continuar una actividad o conversación", href: "/student", icon: <BookOpen/> },
  ] : [
    { label: "Ingresar", description: "Volver a tus cursos", href: "/login", icon: <UserRound/> },
    { label: "Crear cuenta", description: "Empezar como estudiante o docente", href: "/register", icon: <Sparkles/> },
  ], [role]);

  const filtered = items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 80);
    else setQuery("");
  }, [open]);

  return <>
    <button className="obsidian-command-trigger" type="button" onClick={() => setOpen(true)} aria-label="Abrir navegación rápida"><Search/><span>⌘K</span></button>
    <AnimatePresence>
      {open && <motion.div className="obsidian-spotlight-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label="Navegación rápida"
          className="obsidian-spotlight"
          initial={reduce ? false : { opacity: 0, scale: 1.08, y: -18, filter: "blur(18px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05, y: 12, filter: "blur(12px)" }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="obsidian-spotlight-input"><Search aria-hidden="true"/><input ref={inputRef} value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Ir a…" aria-label="Buscar destino"/><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X/></button></div>
          <div className="obsidian-spotlight-results">
            {filtered.map((item, index) => <motion.a key={item.href} href={item.href} className="obsidian-spotlight-item" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : index * .045 }}>
              <span className="spotlight-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span><span aria-hidden="true">→</span>
            </motion.a>)}
            {!filtered.length && <div className="obsidian-spotlight-empty">No hay destinos que coincidan.</div>}
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </>;
}
