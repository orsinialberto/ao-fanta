export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * Condivisa con lo script inline in `app/layout.tsx`. Se cambia qui va
 * cambiata anche lì a mano: quello script gira prima del bundle e non può
 * importare da questo modulo.
 */
export const THEME_STORAGE_KEY = "ao-fanta-theme";

const CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

export function parseThemeChoice(raw: string | null): ThemeChoice {
  return CHOICES.includes(raw as ThemeChoice) ? (raw as ThemeChoice) : "system";
}

export function resolveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

export function nextChoice(current: ThemeChoice): ThemeChoice {
  const i = CHOICES.indexOf(current);
  return CHOICES[(i + 1) % CHOICES.length];
}
