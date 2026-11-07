"use client";
// T047 / FR-050. El nombre visible y el tema del perfil para el shell (AccountButton y el perfil del sidebar), leídos una
// vez por el layout de (app). Sin cuenta (pruebas de componentes de la 001), el shell conserva su acceso mínimo.
// ThemeSync es research R8.6: si el tema del perfil difiere de la cookie (cambiado en otro dispositivo), reescribe la
// cookie y lo aplica con la transición de 180 ms; la carga siguiente ya pinta bien desde el primer cuadro.
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { initialOf } from "@/domain/account";
import { applyTheme, readThemeCookie, writeThemeCookie, type Theme } from "@/lib/theme";
import { themeController } from "./theme-controller";

/** PR B de la 003 (T035, FR-017): el color sale del orden de ingreso a la pareja; sin pareja activa, la persona 1. */
export type ShellAccount = { displayName: string; initial: string; person: 1 | 2; partnerName: string | null; couple: "none" | "provisional" | "active" | null };
const AccountContext = createContext<ShellAccount | null>(null);

type ProviderProps = { displayName: string; theme: Theme; children: ReactNode; person?: 1 | 2; partnerName?: string | null; couple?: ShellAccount["couple"] };

export function AccountProvider({ displayName, theme, children, person = 1, partnerName = null, couple = null }: ProviderProps) {
  useEffect(() => {
    // F43-1, tercera ronda: con una elección hecha en esta página, manda el controlador (el perfil puede venir desfasado).
    if (themeController().hasChoice()) return;
    if (readThemeCookie() !== theme) writeThemeCookie(theme);
    applyTheme(theme);
  }, [theme]);
  return <AccountContext.Provider value={{ displayName, initial: initialOf(displayName), person, partnerName, couple }}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);
