"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  THEME_STORAGE_KEY,
  parseThemeChoice,
  resolveTheme,
  nextChoice,
  type ThemeChoice,
} from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const META: Record<ThemeChoice, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "Tema chiaro" },
  dark: { icon: Moon, label: "Tema scuro" },
  system: { icon: Monitor, label: "Tema di sistema" },
};

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  // Spegne le transizioni per un frame: senza, ogni elemento con una
  // transition sul colore parte insieme e lo switch diventa poltiglia.
  root.setAttribute("data-theme-switching", "");
  root.setAttribute(
    "data-theme",
    resolveTheme(choice, window.matchMedia(DARK_QUERY).matches)
  );
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() =>
      root.removeAttribute("data-theme-switching")
    );
  });
}

export default function ThemeToggle() {
  // Parte da "system" e si allinea dopo il mount: il valore vero sta in
  // localStorage, che sul server non esiste. Lo script inline nel layout ha
  // già dipinto la pagina giusta, quindi non si vede nessun salto.
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    setChoice(parseThemeChoice(window.localStorage.getItem(THEME_STORAGE_KEY)));
  }, []);

  // Il sistema va ascoltato solo mentre lo si sta seguendo.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  function cycle() {
    const next = nextChoice(choice);
    setChoice(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    apply(next);
  }

  const { icon: Icon, label } = META[choice];
  const nextLabel = META[nextChoice(choice)].label.toLowerCase();

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Attiva ${nextLabel}.`}
      title={label}
      className="fixed right-4 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 transition-colors duration-fast ease-standard hover:text-ink md:right-6 md:top-5"
    >
      <Icon size={16} strokeWidth={1.7} />
    </button>
  );
}
