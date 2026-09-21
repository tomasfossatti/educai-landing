"use client";

import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/src/lib/utils";

export function CourseCodeInput({ error, length = 8 }: { error?: boolean; length?: number }) {
  const id = useId();
  const [chars, setChars] = useState<string[]>(Array.from({ length }, () => ""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const value = chars.join("");

  const normalize = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const enter = (raw: string, index: number) => {
    const next = [...chars];
    const entered = normalize(raw).slice(0, length - index);
    if (!entered) next[index] = "";
    else entered.split("").forEach((char, offset) => { next[index + offset] = char; });
    setChars(next);
    if (entered) inputs.current[Math.min(index + entered.length, length - 1)]?.focus();
  };

  return <div className="course-code-input" role="group" aria-labelledby={`${id}-label`}>
    <input type="hidden" name="joinCode" value={value}/>
    <span id={`${id}-label`} className="sr-only">Código del curso</span>
    <motion.div
      className="course-code-slots"
      animate={{ x: error && !reduceMotion ? [0, 3, -3, 3, -3, 0] : 0 }}
      transition={{ duration: reduceMotion ? 0 : .22 }}
    >
      {chars.map((char, index) => <motion.label
        key={index}
        className={cn("course-code-slot", error && "error", char && "filled")}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : index * .035 }}
      >
        <span className="sr-only">Carácter {index + 1} de {length}</span>
        <input
          ref={(node) => { inputs.current[index] = node; }}
          value={char}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          spellCheck={false}
          maxLength={length}
          aria-invalid={error || undefined}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => enter(event.currentTarget.value, index)}
          onPaste={(event) => { event.preventDefault(); enter(event.clipboardData.getData("text"), index); }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const target = char ? index : Math.max(0, index - 1);
              const next = [...chars];
              next[target] = "";
              setChars(next);
              inputs.current[target]?.focus();
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              const target = Math.max(0, Math.min(length - 1, index + (event.key === "ArrowLeft" ? -1 : 1)));
              inputs.current[target]?.focus();
            }
          }}
        />
      </motion.label>)}
    </motion.div>
    <div className="course-code-preview" aria-live="polite">{value.length ? `${value.length}/${length} caracteres` : "Pegá o escribí el código que te compartió tu docente"}</div>
  </div>;
}
