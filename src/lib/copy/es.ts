export const copy = {
  shell: { skip: "Ir al contenido", navigation: "Navegación principal", brand: "Juntia", notice: "Esta versión es la base de Juntia. Todavía no guarda datos." },
  nav: { home: "Inicio", activity: "Actividad", goals: "Metas", plan: "Plan", balance: "Balance", account: "Mi cuenta", annotate: "Anotar", shortcut: "N" },
  context: { me: "Yo", us: "Nosotros", label: "Contexto", announce: (label: string) => `Ahora ves: ${label}` },
  annotate: { title: "Anotar un gasto", description: "Registrar gastos llega con la próxima versión. Todavía no puedes guardar movimientos.", close: "Cerrar" },
  empty: {
    home: { title: "Tu día a día, aquí", description: "Este será el lugar para ver tus movimientos." },
    activity: { title: "Todavía no hay movimientos", description: "Aquí podrás revisar lo que registres." },
    goals: { title: "Un lugar para tus metas", description: "Aquí podrás seguir lo que quieres construir." },
    plan: { title: "Planifica a tu manera", description: "Los presupuestos serán opcionales. Podrás registrar gastos sin crear uno." },
  },
  balance: { title: "Todavía no disponible", description: "El balance aparece cuando exista la pareja." },
  account: { title: "Mi cuenta", description: "Tu cuenta llega con el inicio de sesión.", back: "Volver" },
  states: { notFound: "No encontramos esta página", error: "No pudimos mostrar esta página", retry: "Reintentar", home: "Ir a Inicio" },
  primitives: { loading: "Cargando…", saving: "Guardando…", amount: "Monto", amountHelp: "Escribe el monto en pesos enteros.", amountError: "Revisa el monto y usa solo números.", pending: "POR SALDAR", settled: "LIQUIDADO", exceeded: "EXCEDIDO", nearLimit: "CERCA DEL LÍMITE", private: "PRIVADO" },
  internal: { title: "Superficie interna de revisión", note: "Valores de prueba para revisar los primitivos. No son datos financieros de una persona.", light: "Claro", dark: "Oscuro" },
} as const;
