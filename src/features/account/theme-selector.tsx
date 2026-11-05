"use client";
// T047 / FR-052; COMPONENT_SPECIFICATIONS.md §ThemeSelector: `radiogroup` de 3 tarjetas con miniatura; las flechas
// cambian y aplican; la seleccionada lleva anillo de 2 px e ícono Fill. El cambio de color usa la transición de 180 ms
// del body (globals.css), que con movimiento reducido no existe. Persistencia aprobada (Q7): `profiles` + cookie.
// La miniatura se pinta con los tokens del tema que representa (`data-theme` local), sin colores sueltos.
import Link from "next/link";
import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { copy } from "@/lib/copy/es";
import { applyTheme, writeThemeCookie, type Theme } from "@/lib/theme";
import type { AccountActionResult } from "./types";

const options: readonly { value: Theme; icon: AppIconName }[] = [
  { value: "light", icon: "sun" },
  { value: "dark", icon: "moon" },
  { value: "system", icon: "circle-half" },
];

function Preview({ theme }: { theme: Theme }) {
  const panel = (mode: "light" | "dark", half = "") => (
    <span data-theme={mode} className={`flex flex-col gap-1.5 bg-canvas p-2.5 ${half}`}>
      <span className="h-2 w-3/5 rounded-[3px] bg-[var(--color-text-primary)]" />
      <span className="h-[18px] w-[90%] rounded-[6px] bg-sunken" />
      <span className="h-[18px] w-1/2 rounded-[6px] bg-primary" />
    </span>
  );
  return (
    <span aria-hidden="true" className="grid h-24 w-full overflow-hidden rounded-[16px]">
      {theme === "system" ? (
        <span className="grid grid-cols-2">{panel("light", "pr-0")}{panel("dark", "pl-0")}</span>
      ) : panel(theme)}
    </span>
  );
}

type ThemeSelectorProps = { initial: Theme; persist: (theme: Theme) => Promise<AccountActionResult> };

export function ThemeSelector({ initial, persist }: ThemeSelectorProps) {
  const [value, setValue] = useState<Theme>(initial);
  const [expired, setExpired] = useState(false);
  const [, startTransition] = useTransition();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Las respuestas pueden llegar desordenadas si se cambia rápido: solo cuenta la de la última elección.
  const latest = useRef(0);

  const choose = (theme: Theme) => {
    setValue(theme);
    applyTheme(theme);
    writeThemeCookie(theme);
    const request = ++latest.current;
    startTransition(async () => {
      const result = await persist(theme);
      if (request !== latest.current) return;
      setExpired(!result.ok && result.error === "sessionExpired");
    });
  };

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = options.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowDown: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, ArrowUp: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    refs.current[next]?.focus();
    choose(options[next].value);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div role="radiogroup" aria-label={copy.account.appearance.label} className="grid grid-cols-3 gap-2.5">
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(node) => { refs.current[index] = node; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-theme-option={option.value}
              onClick={() => choose(option.value)}
              onKeyDown={(event) => move(event, index)}
              className="group flex min-w-0 flex-col items-center gap-2 rounded-[18px] p-1 text-[13px] font-semibold text-ink focus-visible:outline-offset-2"
            >
              <span className={`w-full rounded-[18px] p-[3px] ${selected ? "shadow-[0_0_0_2px_var(--color-text-primary)]" : "shadow-[0_0_0_1px_var(--color-border-subtle)]"}`}>
                <Preview theme={option.value} />
              </span>
              <span className="flex items-center gap-1.5">
                <AppIcon name={option.icon} weight={selected ? "fill" : "regular"} size={16} />
                {copy.account.appearance[option.value]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[13px] leading-[1.45] text-ink-secondary">{copy.account.appearance.help}</p>
      {expired ? (
        <InlineNotice tone="danger" icon="warning-circle">
          {copy.errors.sessionExpired}{" "}
          <Link href={`/entrar?volver=${encodeURIComponent("/cuenta/apariencia")}`} className="font-semibold text-ink underline underline-offset-2">{copy.account.signInAgain}</Link>
        </InlineNotice>
      ) : null}
    </div>
  );
}
