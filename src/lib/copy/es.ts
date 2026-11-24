export const copy = {
  // 004 PR A: claves del contrato JT201–JT226; redacción para revisión humana.
  goals: {
    errors: {
      notFound: "Esta meta no está disponible.", notOpen: "Esta meta no admite esta operación.",
      insufficient: (amount:string) => `Puedes retirar hasta ${amount}.`,
      fundsChanged: (amount:string,goal:string) => `Tus aportes cambiaron: ahora tienes ${amount} en ${goal}.`,
      entryNotFound: "Este aporte no está disponible.", alreadyVoided: "Este aporte ya está anulado.",
      date: "Elige hoy o una fecha pasada, desde la creación de la meta.",
      cannotArchive: "Para archivar, la meta debe estar sin fondos y sin solicitudes pendientes.",
      cannotComplete: "No se puede dar por lograda esta meta.",
      // F68-1 (revisión del PR #68): neutral. La lectura de la meta no dice quién la cambió (puede ser la pareja u otra
      // pestaña de quien mira): no se atribuye.
      // F68-2: no afirma que la página ya se actualizó (el refresco puede no haber llegado o fallar).
      versionConflict: "Esta meta cambió en otro lugar. Revisa su estado antes de intentarlo de nuevo.",
      undoNotAvailable: "Ya no se puede deshacer. Revisa el historial de la meta.",
      // 004 PR C (revisión del PR #68; Q13, FR-042): anular o deshacer un aporte cuyos fondos ya se usaron o se retiraron.
      fundsUsed: "Ya no se puede anular: esos fondos ya se usaron o se retiraron de la meta.",
      fundsUsedWith: (amount: string) => `Ya no se puede anular: esos fondos ya se usaron o se retiraron. Te quedan ${amount} disponibles en esta meta.`,
    },
    form: {errors:{name:"Escribe un nombre de hasta 60 caracteres.",type:"Elige un tipo de meta.",target:"Escribe un objetivo entre $1 y $999.999.999.",month:"Elige un mes válido."}},
    withdraw: {errors:{reason:"Escribe un motivo de hasta 140 caracteres."}},
    // 004 PR C (T045–T050; 04·3, 04·6, 04·7; GoalCard, GoalStack, S5). Copy nuevo para revisión de los fundadores en el PR;
    // los textos de los comps se copian tal cual. Glosario §9: «Registrar aporte», nunca «Depositar» ni «Invertir»; un
    // retiro es «Retiro de la meta» (decisión de los fundadores del 12 de noviembre de 2026, T084: antes «Retiro de meta ·
    // reasignación»), nunca «Ingreso»; nunca «Llegarán», «te alcanza» ni «Total gastado».
    title: "Metas",
    scope: { shared: "COMPARTIDA", personal: "PERSONAL" },
    types: { travel: "Viaje", home: "Vivienda", wedding: "Boda", vehicle: "Vehículo", education: "Educación", emergency: "Emergencias", other: "Otra" },
    empty: {
      us: { title: "Todavía no tienen metas", description: "Una meta les ayuda a apartar dinero juntos para algo que quieren. El dinero sigue donde lo tengan.", action: "Crear una meta" },
      me: { title: "Todavía no tienes metas", description: "Una meta te ayuda a apartar dinero para algo que quieres. El dinero sigue donde lo tengas.", action: "Crear una meta" },
    },
    totals: {
      us: "Apartado en metas compartidas", usNote: "Es dinero apartado, no gastado. Sigue donde lo tengan.",
      me: "Apartado en tus metas", meNote: "Es dinero apartado, no gastado. Sigue donde lo tengas.",
    },
    sections: { mine: "Tus metas", shared: "Metas compartidas", sharedNote: "Cada una muestra tu disponible. No se suman a tus metas.", archived: "Archivadas" },
    // T084 (8): la cifra es lo disponible (`my_available_minor`), como en la meta inmersiva (F06).
    yourShare: (amount: string) => `Tu disponible ${amount}`,
    ofTarget: (balance: string, target: string) => `${balance} de ${target}`,
    percent: (value: number) => `${value} %`,
    due: (month: string) => `Para ${month}`,
    noDate: "Sin fecha",
    pace: {
      line: (remaining: string, months: number, monthly: string) => `Faltan ${remaining} en ${months === 1 ? "1 mes" : `${months} meses`} · ${monthly} al mes`,
      estimate: "Estimación",
      pastDue: (month: string) => `La fecha era ${month}`,
    },
    reached: { us: "Lo lograron", me: "Lo lograste" },
    reachedHint: "Cuando quieran, pueden darla por lograda.",
    surplus: (amount: string) => `${amount} por encima del objetivo`,
    status: { completed: "LOGRADA", archived: "ARCHIVADA" },
    pending: "Hay una solicitud de fondos pendiente.",
    ribbon: {
      label: (parts: string, target: string) => `Apartado por persona: ${parts}. Objetivo ${target}.`,
      part: (name: string, amount: string) => `${name} ${amount}`,
      pace: (percent: number) => `marca de ritmo al ${percent} % del tiempo`,
    },
    card: {
      // Revisión del PR #68 (T052): mientras se abre la meta inmersiva, la tarjeta tocada lo dice.
      opening: (name: string) => `Abriendo ${name}…`,
      accessibleName: ({ name, scope, percent, balance, target }: { name: string; scope: string; percent: number; balance: string; target: string }) =>
        `${name}, meta ${scope}, ${percent} %, ${balance} de ${target}`,
    },
    stack: { count: (count: number) => (count === 1 ? "1 meta" : `${count} metas`), seeAll: "Ver todas", create: "Crear meta", list: "Metas", showAll: "Todas las metas", collapse: "Ver en pila" },
    immersive: {
      close: "Cerrar meta", back: "Volver a Metas", contribute: "Registrar aporte", withdraw: "Retirar", history: "Historial",
      edit: "Editar meta", complete: "Dar por lograda", archive: "Archivar", more: "Más acciones", target: "Objetivo",
      // F06 (auditoría de Impeccable; propuesta aprobada por los fundadores el 11 de noviembre de 2026; copy a aprobar en
      // pantalla): arriba, lo disponible de cada uno, que es lo que se puede usar o retirar; el historial dice lo aportado.
      members: "Aportes por persona", available: "Disponible por persona",
      member: (name: string, amount: string, count: number) => `${name} ${amount} · ${count === 1 ? "1 aporte" : `${count} aportes`}`,
      availableOf: (name: string, amount: string) => `Disponible de ${name} ${amount}`,
      availableMine: (amount: string) => `Tu disponible ${amount}`,
      contributedSuffix: (amount: string, mine: boolean) => ` · ${mine ? "aportaste" : "aportó"} ${amount}`,
      readOnly: "Meta archivada: queda de solo lectura con su historial.",
      completedNote: "Meta lograda: admite usos y retiros, no aportes nuevos.",
      notFound: { title: "No encontramos esta meta", description: "Puede que no exista o que no sea de este contexto. En Metas están todas las que puedes ver." },
    },
    sheet: {
      createTitle: "Nueva meta", editTitle: "Editar meta", name: "Nombre", type: "Tipo de meta", target: "Objetivo",
      month: "Fecha objetivo (opcional)", monthHelp: "Mes y año. Sin fecha no hay ritmo.", clearMonth: "Sin fecha", monthLabel: "Mes", yearLabel: "Año",
      scopeNote: { us: "Será una meta compartida: la ven y aportan los dos.", me: "Será una meta personal: solo tú la ves." },
      submitCreate: "Crear meta", submitEdit: "Guardar cambios", submitting: "Guardando…",
      created: (name: string) => `Meta «${name}» creada`, updated: "Cambios guardados", rejected: "No se guardó.",
      // F68-1 (revisión del PR #68): conflicto de versión al editar (JT011). Sin autor: la lectura no lo trae. Para T056.
      conflict: {
        title: "Esta meta cambió mientras la editabas.",
        notSaved: (summary: string) => `Tus cambios no se guardaron: ${summary}.`,
        current: (summary: string) => `Ahora: ${summary}.`,
        checking: "Revisando la versión vigente…", reload: "Volver a cargar", review: "Revisar",
        reviewNote: "Revisa los valores vigentes y guarda de nuevo si quieres cambiarlos.",
      },
    },
    contribute: {
      title: "Registrar aporte", amount: "Monto del aporte",
      preview: (balance: string, percent: number) => `Con este aporte ${balance} · ${percent} %`,
      explain: { us: "Un aporte aparta dinero para la meta. No es un gasto ni una transferencia: el dinero sigue donde lo tengan.", me: "Un aporte aparta dinero para la meta. No es un gasto ni una transferencia: el dinero sigue donde lo tengas." },
      mode: "Cómo lo apartas", modes: { reserved: "Apartado en Juntia", transferred_declared: "Transferencia declarada" },
      modeHelp: "Transferencia declarada: lo pasaste a otra cuenta tuya. Juntia no lo verifica.",
      date: "Fecha",
      // F18 (auditoría de Impeccable): con el campo vacío, el botón no dice «$0».
      submit: (amount: string) => `Registrar aporte de ${amount}`, submitEmpty: "Registrar aporte", submitting: "Registrando…",
      done: (amount: string, goal: string) => `Aporte de ${amount} a ${goal}`, undone: "Aporte deshecho", rejected: "No se registró el aporte.",
      errors: { amount: "Escribe un monto entre $1 y $999.999.999." },
    },
    withdrawSheet: {
      title: "Retirar de la meta", amount: "Monto a retirar", reason: "Motivo", reasonPlaceholder: "Para qué lo usas",
      max: (amount: string) => `Puedes retirar hasta ${amount}`,
      explain: "Retirar libera dinero que apartaste. No es un ingreso.",
      onlyYours: "Solo se retira de tus propios aportes.",
      nothing: "No tienes aportes disponibles en esta meta.",
      date: "Fecha",
      submit: (amount: string) => `Retirar ${amount}`, submitEmpty: "Retirar", submitting: "Retirando…",
      done: (amount: string, goal: string) => `Retiro de ${amount} de ${goal}`, undone: "Retiro deshecho", rejected: "No se registró el retiro.",
    },
    history: {
      title: "Historial", filter: "Filtrar por persona", all: "Todos", empty: "Todavía no hay movimientos en esta meta.",
      monthTotal: (amount: string) => `Aportes ${amount}`,
      contribution: "Aporte", withdrawal: "Retiro de la meta", usage: (description: string) => `Uso · ${description}`, usageFallback: "Uso en un gasto",
      by: (name: string) => `De ${name}`,
      voided: "ANULADO", undone: "DESHECHO",
      void: { action: "Anular aporte", title: "¿Anular este aporte?", description: "Sale del saldo de la meta y de los aportes de su mes. Sigue en el historial, marcado como anulado.", confirm: "Anular aporte", keep: "Conservar", done: "Aporte anulado", rejected: "No se anuló el aporte." },
      accessibleName: ({ title, amount, who, date, voided }: { title: string; amount: string; who: string; date: string; voided: boolean }) =>
        `${title}, ${amount} pesos, ${who}, ${date}${voided ? ", anulado" : ""}`,
    },
    statusDialog: {
      completeTitle: "¿Dar por lograda esta meta?", completeDescription: "Sigue admitiendo usos y retiros, pero no aportes nuevos.", completeConfirm: "Dar por lograda",
      archiveTitle: "¿Archivar esta meta?", archiveDescription: "Queda de solo lectura en «Archivadas» y conserva su historial.", archiveConfirm: "Archivar", keep: "Cancelar",
      completedDone: "Meta dada por lograda", archivedDone: "Meta archivada",
    },
    activity: {
      contribution: (goal: string) => `Aporte a ${goal}`, contributionMeta: (name: string) => `${name} · ahorro, no es consumo`,
      withdrawal: "Retiro de la meta", withdrawalMeta: (goal: string, name: string, reason: string | null) => [goal, reason, name].filter(Boolean).join(" · "),
      // T084 (8): el uso sí cuenta en el gasto del mes; la fila ya no dice «no es un gasto nuevo».
      usage: (goal: string) => `Uso de ${goal}`, usageMeta: (description: string) => description,
      setAside: "Apartado", spent: (month: string) => `Gasto ${month}`, filter: "Aportes",
    },
    home: {
      usSetAside: "Apartado para metas", usNote: "Son cosas distintas: no se suman.",
      meSetAside: (amount: string) => `Apartaste ${amount} para metas`, meNote: "Es ahorro: no se suma al gasto.",
      module: "Metas", create: "Crear una meta", createHint: "Aparten dinero para algo que quieren, sin mezclarlo con el gasto.",
    },
    loading: "Cargando metas",
  },
  goalExpense: {errors:{
    exceedsExpense:"El uso de la meta no puede superar el monto del gasto.",
    requestGone:"Esta solicitud no está disponible.",resolved:"Esta solicitud ya se resolvió.",
    removeUsageFirst:"Primero quita el uso de la meta o usa menos.",
    allocation:"Revisa los fondos: deben sumar el uso y estar disponibles por aportante.",
    nothingToRemove:"Este gasto no tiene uso de meta ni solicitud que quitar.",
    versionConflict:"La solicitud cambió. Revisa su estado.",
    // 004 PR D (T060–T064): rechazos que la interfaz dice con su propio texto (contracts/errors.md).
    insufficient:(name:string,amount:string)=>`${name} tiene ${amount} disponibles en esta meta.`,
    insufficientOwn:(amount:string)=>`Tienes ${amount} disponibles en esta meta.`,
    goalClosed:"Esta meta ya no admite usos. Elige otra o paga con dinero del mes.",
    expenseVoided:"Este gasto ya se eliminó: no hay uso que quitar.",
    transactionChanged:"Este gasto cambió en otro lugar. Revisa su estado antes de intentarlo de nuevo.",
  },
    // 004 PR D (T060–T064; 04·11 B1–B7; FundingLedger, ConfirmationBadge y ChangePreview en B3, aprobados en su forma,
    // decisión 22.3). Copy nuevo para revisión de los fundadores en el PR (T069). Glosario §9 y DEC-R17: un uso de meta
    // nunca es «un gasto nuevo» ni un ingreso; nunca «te alcanza»; Juntia no mueve dinero.
    paidWith: { label: "Cómo se pagó", month: "Dinero del mes", goal: "Con una meta" },
    picker: {
      title: "Con qué meta", loading: "Cargando metas…", failed: "No pudimos cargar las metas.", retry: "Reintentar",
      empty: { us: "Todavía no tienen metas compartidas para usar.", me: "Todavía no tienes metas personales para usar." },
      // Lectura 12 de la spec: una explicación genérica, sin consultar ni pintar ninguna meta personal (FR-085).
      note: { us: "Las metas personales solo se usan en gastos de Yo.", me: "Las metas compartidas se usan en gastos de Nosotros." },
      balance: (amount: string) => `Saldo ${amount}`,
      noFunds: "Sin fondos para usar",
      option: (name: string, amount: string) => `${name}, saldo ${amount}`,
    },
    summary: { open: "Uso de la meta", line: (goal: string, amount: string) => `${goal} · usa ${amount}`, choose: "Elige la meta" },
    subtitle: (amount: string) => `Gasto de ${amount}`,
    back: "Volver al gasto",
    ledger: {
      usage: "Cuánto se paga con la meta",
      usageHelp: "No puede ser más que el gasto.",
      splitTitle: "Reparto del gasto · quién lo asume",
      splitNote: "Define el balance entre ustedes. No cambia con la meta.",
      fundsTitle: "Fondos de la meta · de quién son",
      mine: "Tus fondos", theirs: (name: string) => `Fondos de ${name}`,
      available: (amount: string) => `Disponible ${amount}`,
      needsApproval: "Pide aprobación",
      sum: (sum: string, usage: string) => `Suman ${sum} de ${usage}`,
      missing: (amount: string) => `Faltan ${amount}`,
      over: (amount: string) => `Sobran ${amount}`,
      exceedsExpense: "El uso no puede superar el gasto.",
      exceedsAvailable: (name: string, amount: string) => `${name} tiene ${amount} disponibles.`,
      exceedsAvailableMine: (amount: string) => `Tienes ${amount} disponibles.`,
      when: (name: string) => `Tus fondos se usan al registrar; los de ${name}, solo si aprueba.`,
      whenMine: "Tus fondos se usan al registrar.",
    },
    effect: {
      title: "Efecto", now: (goal: string) => `${goal} ahora`, ifApproves: (name: string) => `Si ${name} aprueba`,
      expense: "Gasto del mes", expenseNote: "Es una compra real: cuenta como gasto. La meta solo dice con qué dinero se pagó.",
      noMove: "Juntia no mueve dinero.",
      row: (label: string, before: string, after: string) => `${label}: antes ${before}, después ${after}`,
    },
    submit: { own: (amount: string) => `Registrar gasto de ${amount}`, ask: (name: string) => `Registrar y pedir a ${name}`, saving: "Registrando…" },
    saved: { own: (goal: string) => `Gasto registrado con ${goal}`, ask: (name: string) => `Gasto registrado. Falta que ${name} apruebe sus fondos.` },
    // ConfirmationBadge (decisión 22.3): «NO SE REGISTRÓ» solo con un rechazo confirmado del servidor (lección F47-4).
    badge: {
      pending: (name: string) => `PENDIENTE DE ${name.toLocaleUpperCase("es")}`, approved: "APROBADO",
      rejected: (name: string) => `${name.toLocaleUpperCase("es")} NO APROBÓ`, failed: "NO SE REGISTRÓ", funded: "CON META",
    },
    failed: "No se registró el gasto.",
    request: {
      region: "Solicitudes de fondos",
      // B4: quien pide.
      waiting: (name: string) => `El gasto ya está registrado. Falta solo el uso de los fondos de ${name}.`,
      asks: (amount: string, name: string, goal: string) => `Pides ${amount} de los aportes de ${name} en ${goal}`,
      noExpiry: "No vence.",
      cancel: "Cancelar solicitud", cancelling: "Cancelando…", cancelled: "Solicitud cancelada. El gasto sigue registrado.",
      // B5: a quien se pide.
      title: (name: string) => `${name} pide usar tus fondos`,
      expense: (description: string, amount: string) => `${description} · ${amount}`,
      split: (mode: string) => `Reparto ${mode}`,
      used: (name: string, amount: string) => `${name} ya usó ${amount} de sus aportes`,
      // Fundadores, 19 nov 2026: «Tu disponible», no «Tus aportes»: la cifra de antes es lo disponible de quien aprueba (como
      // en Metas · Yo, decisión del 12 nov), no lo que aportó. Antes «Tus aportes en {meta} $X → $Y», el texto del comp B5.
      yours: (goal: string, before: string, after: string) => `Tu disponible en ${goal}: ${before} → ${after}`,
      yoursLabel: (goal: string, before: string, after: string) => `Tu disponible en ${goal}: antes ${before}, después ${after}`,
      rejectNote: "Si rechazas, el gasto sigue registrado y tus aportes no cambian.",
      approve: (amount: string) => `Aprobar ${amount}`, approving: "Aprobando…", reject: "Rechazar", rejecting: "Rechazando…",
      approved: (goal: string) => `Aprobaste el uso de tus fondos en ${goal}.`,
      rejected: "Rechazaste la solicitud. El gasto sigue registrado y tus aportes no cambian.",
      review: "Revisar",
      expenseFallback: "Gasto",
      closedUnconfirmed: "No pudimos confirmar si se guardó. Revisa el estado de la solicitud antes de volver a intentarlo.",
    },
    detail: {
      title: "Pagado con una meta",
      use: (goal: string, name: string) => `Uso de ${goal} · Aportes de ${name}`,
      rowMeta: (name: string, description: string) => `Aportes de ${name} · ${description}`,
      pending: (amount: string, name: string) => `${amount} pendientes de ${name}`,
      approvedNote: (name: string) => `${name} aprobó el uso de sus fondos.`,
      rejectedNote: (name: string) => `${name} no aprobó. Solo cuentan los fondos ya usados.`,
    },
    remove: {
      action: "Quitar el uso de la meta", title: "¿Quitar el uso de la meta?",
      description: (goal: string) => `Los fondos vuelven a cada aportante en ${goal}. El gasto sigue registrado, pagado con dinero del mes.`,
      pendingNote: "La solicitud pendiente también se cancela.",
      confirm: "Quitar el uso", keep: "Conservar", removing: "Quitando…",
      done: "Uso quitado",
    },
    // La etiqueta de un uso que se quitó, en el historial de la meta y en Actividad.
    usageRemoved: "USO QUITADO",
    deleteWarning: (goal: string) => `También se quita el uso de ${goal}: los fondos vuelven a sus aportantes.`,
    // F64-1, opción (a): anular un gasto pagado con una meta archivada la reactiva sola.
    reactivated: (goal: string, amount: string) => `La meta ${goal} volvió a estar activa: se devolvieron ${amount}`,
    limit: { title: "No se puede mover este gasto", description: "Está pagado con una meta personal. Primero quita el uso de la meta; después podrás moverlo a Pareja." },
  },
  plan: {errors:{notFound:"Este presupuesto no está disponible.",alreadyExists:(name:string)=>`${name} ya creó este presupuesto.`,versionConflict:(name:string)=>`${name} cambió este presupuesto.`,
    // Revisión del gestor del PR #67 (3): cuando el último cambio es de quien mira (otra pestaña u otro dispositivo).
    versionConflictMe:"Cambiaste este presupuesto en otro lugar.",alreadyExistsMe:"Ya creaste este presupuesto en otro lugar."},form:{errors:{limit:"Elige una categoría de gasto y un límite entre $1 y $999.999.999."}},
    // 004 PR B (T033, T034; FR-017, FR-018, FR-020, FR-100; 04·2 Plan). Copy nuevo para revisión de los fundadores en el PR.
    // DEC-R01 y DEC-R17: nunca «Presupuesto $0», «te alcanza» ni «puedes pagarlo»; el estado nunca solo con color.
    optional: { us: "Los presupuestos son opcionales: pónganlos solo donde les sirvan.", me: "Los presupuestos son opcionales: ponlos solo donde te sirvan." },
    daysLeft: (days: number, month: string) => days === 0 ? `Hoy termina ${month}.` : days === 1 ? `Queda 1 día de ${month}.` : `Quedan ${days} días de ${month}.`,
    summary: { title: (month: string) => `Así va ${month}`, me: (amount: string) => `Gastaste ${amount}`, us: (amount: string) => `Gastaron ${amount} juntos`, none: (month: string) => `Todavía no hay gastos en ${month}.` },
    budgets: "Presupuestos",
    loading: "Cargando el plan",
    of: (limit: string) => `de ${limit}`,
    left: (amount: string) => `Quedan ${amount}`,
    leftPercent: (amount: string, percent: number) => `Quedan ${amount} · ${percent} %`,
    over: { us: (amount: string, percent: number) => `Se pasaron por ${amount} · ${percent} %`, me: (amount: string, percent: number) => `Te pasaste por ${amount} · ${percent} %` },
    bar: (category: string, consumed: string, limit: string, percent: number) => `${category}: ${consumed} de ${limit}, ${percent} %`,
    edit: (category: string) => `Editar el presupuesto de ${category}`,
    noBudget: (amount: string) => `${amount} · sin presupuesto`,
    create: "Crear",
    createFor: (category: string) => `Crear presupuesto de ${category}`,
    createBudget: "Crear presupuesto",
    empty: { title: "Sin presupuesto", us: "Pueden ver en qué se va el mes sin crear ninguno.", me: "Puedes ver en qué se va el mes sin crear ninguno.", action: "Crear presupuesto (opcional)" },
    who: { us: "Cualquiera de los dos puede crear, editar o desactivar un presupuesto, sin segunda aprobación.", me: "Solo tú ves tus presupuestos." },
    lastChange: (change: string, date: string) => `Último cambio: ${change} · ${date}.`,
    change: {
      create: (name: string, category: string, amount: string) => `${name} creó ${category} con ${amount}`,
      raise: (name: string, category: string, amount: string) => `${name} subió ${category} a ${amount}`,
      lower: (name: string, category: string, amount: string) => `${name} bajó ${category} a ${amount}`,
      keep: (name: string, category: string, amount: string) => `${name} dejó ${category} en ${amount}`,
      deactivate: (name: string, category: string) => `${name} desactivó ${category}`,
      reactivate: (name: string, category: string, amount: string) => `${name} volvió a activar ${category} con ${amount}`,
    },
    // En Yo quien mira es quien hizo el cambio: primera persona (revisión de acabado del PR B).
    changeMe: {
      create: (category: string, amount: string) => `Creaste ${category} con ${amount}`,
      raise: (category: string, amount: string) => `Subiste ${category} a ${amount}`,
      lower: (category: string, amount: string) => `Bajaste ${category} a ${amount}`,
      keep: (category: string, amount: string) => `Dejaste ${category} en ${amount}`,
      deactivate: (category: string) => `Desactivaste ${category}`,
      reactivate: (category: string, amount: string) => `Volviste a activar ${category} con ${amount}`,
    },
    sheet: {
      createTitle: "Crear presupuesto", editTitle: "Editar presupuesto",
      context: { us: "En Nosotros: lo ven los dos.", me: "En Yo: solo tú lo ves." },
      category: "Categoría", limit: "Límite mensual",
      rule: (month: string) => `Rige desde ${month} y cada mes siguiente, hasta que se cambie o se desactive. Los meses anteriores conservan su límite.`,
      thisMonth: (amount: string, month: string) => `En ${month} van ${amount}.`,
      save: "Guardar presupuesto", saveChanges: "Guardar cambios", saving: "Guardando…",
      deactivate: "Desactivar presupuesto",
      deactivateNote: "Los gastos y el historial se conservan. Los meses anteriores mantienen su límite.",
      rejected: "No se guardó el presupuesto.",
      checkingLatest: "Revisando el valor vigente…",
      reload: "Volver a cargar",
      closeUnconfirmed: "No pudimos confirmar si se guardó. Revisa Plan antes de volver a intentarlo.",
      current: (amount: string) => `Ahora el límite es ${amount}.`,
      currentOff: "Ahora no tiene presupuesto.",
      review: "Revisar",
      history: "Historial",
      historyBy: (name: string, date: string) => `${name} · ${date}`,
      historyByMe: (date: string) => `Tú · ${date}`,
      // T084 (7), decisión de los fundadores del 12 de noviembre de 2026: lo que escribió la persona, junto al valor vigente.
      yourChange: (amount: string) => `Tu cambio: ${amount}`,
      notSavedOff: "Tu desactivación no se guardó.",
      historyValue: {
        create: (amount: string) => `Creó con ${amount}`,
        change: (from: string, to: string) => `De ${from} a ${to}`,
        deactivate: (from: string) => `Lo desactivó; tenía ${from}`,
        reactivate: (amount: string) => `Lo volvió a activar con ${amount}`,
      },
    },
    saved: { created: "Presupuesto creado.", updated: "Presupuesto actualizado.", deactivated: "Presupuesto desactivado." },
    // 004 PR E (T075; FR-021; Q5): el acceso a Análisis desde Plan.
    analysis: (month: string) => `Ver el análisis de ${month}`,
  },
  // 004 PR E (T073–T075; FR-021–FR-025, FR-063; US-3; 04·2 Análisis; MOTION_SYSTEM §5; COMPONENT_SPECIFICATIONS «Chart» y
  // «PlanningNote»). Copy nuevo para revisión de los fundadores en el PR. Descriptivo y sin culpa: la comparación nombra
  // categorías, nunca un gasto ni una causa (Q10); nunca «Total gastado» ni «te alcanza» (DEC-G04, DEC-R17); el ahorro va aparte.
  analysis: {
    title: "Análisis",
    loading: "Cargando el análisis",
    month: "Mes del análisis",
    chapter: (number: number) => `Capítulo ${number}`,
    chapters: { amount: "Cuánto", where: "En qué", compared: "Comparado", setAside: "Lo apartado" },
    spent: { us: "Gastaron juntos", me: "Gastaste" },
    noSpending: { us: (month: string) => `En ${month} no hay gastos de Nosotros.`, me: (month: string) => `En ${month} no anotaste gastos.` },
    comparison: {
      // Revisión del PR #71 (3): con menos del 1 % de diferencia, sin «(+0 %)».
      more: (amount: string, percent: number, month: string) => `${amount} más que en ${month}${percent ? ` (+${percent} %)` : ""}.`,
      less: (amount: string, percent: number, month: string) => `${amount} menos que en ${month}${percent ? ` (−${percent} %)` : ""}.`,
      same: (month: string) => `Lo mismo que en ${month}.`,
      rose: (categories: readonly string[]) => `Lo que más subió: ${categories.join(" y ")}.`,
    },
    where: {
      none: "Sin gastos por categoría en este mes.",
      budgets: "Con presupuesto",
      noBudgets: { us: "No tienen presupuestos en este mes: solo lo gastado por categoría.", me: "No tienes presupuestos en este mes: solo lo gastado por categoría." },
      elapsed: (percent: number) => `La marca es lo que va del mes: ${percent} %.`,
    },
    compared: {
      chart: "Gasto por mes",
      caption: "Solo el gasto de los meses con datos, hasta seis. Lo apartado para metas va aparte.",
      table: "Gasto por mes, en pesos",
      // F71-3, decisión de los fundadores del 11 nov 2026: la tabla desplegable bajo el gráfico.
      show: "Ver cifras exactas",
      hide: "Ocultar cifras exactas",
      month: "Mes",
      amount: "Gasto",
      first: "Es el primer mes con gastos: todavía no hay con qué comparar.",
      empty: "Todavía no hay meses con gastos para comparar.",
      millions: (value: string) => `${value} M`,
      thousands: (value: string) => `${value} mil`,
    },
    setAside: {
      // F14 (auditoría de Impeccable): la cifra apartada se pinta aparte, en verde ahorro como en Inicio; esto es el resto.
      us: (parts: string) => ` · ${parts}. Va aparte: no es gasto.`,
      me: ". Va aparte: no es gasto.",
      part: (name: string, amount: string) => `${name} ${amount}`,
      none: { us: (month: string) => `En ${month} no apartaron nada para metas.`, me: (month: string) => `En ${month} no apartaste nada para metas.` },
    },
    note: {
      overline: "Destinado neto · para planificar",
      fixed: "No es lo gastado ni un saldo bancario.",
      negative: "Negativo: liberaron de metas más de lo que destinaron.",
      how: "Cómo se calcula",
      terms: { spent: "Gasto", contributed: "Aportes", withdrawn: "Retiros", funded: "Gastos pagados con metas", net: "Destinado neto" },
      signs: { plus: "más", minus: "menos", equals: "igual a" },
    },
    previousMonth: (label: string) => `Análisis del mes anterior: ${label}`,
    nextMonth: (label: string) => `Análisis del mes siguiente: ${label}`,
  },
  shell: { skip: "Ir al contenido", navigation: "Navegación principal", brand: "Juntia" },
  // Marca 1c (comp 09b, fundadores 23 nov 2026). La misma tarjeta para todos los enlaces, también la invitación: sin datos.
  // La descripción la eligieron los fundadores el 24 nov 2026 (la opción 2).
  share: { description: "Las cuentas de la pareja, claras: quién pagó, cuánto le toca a cada uno y lo que ahorran juntos.", imageAlt: "Juntia. Lo tuyo, lo mío y lo nuestro. Finanzas en pareja." },
  nav: { home: "Inicio", activity: "Actividad", goals: "Metas", plan: "Plan", balance: "Balance", account: "Mi cuenta", annotate: "Anotar", annotateBlock: "Anotar gasto", shortcut: "N" },
  context: { me: "Yo", us: "Nosotros", label: "Contexto", announce: (label: string) => `Ahora ves: ${label}` },
  // P0-1, PR D (02·5, 02·6, 02·1, 04·1). Copy nuevo para revisión de los fundadores en el PR.
  annotate: {
    split: { errors: { invalid: "Revisa el reparto: las partes deben sumar el monto." } },
    title: { expense: "Anotar gasto", income: "Anotar ingreso" }, editTitle: { expense: "Editar gasto", income: "Editar ingreso" },
    type: "Tipo de movimiento", expense: "Gasto", income: "Ingreso",
    amount: "Monto", category: "Categoría",
    description: "Descripción (opcional)", descriptionPlaceholder: "Descripción (opcional)", date: "Fecha", onlyYou: "Solo tú",
    save: { expense: "Guardar", income: "Guardar ingreso" }, saveWithAmount: (label: string, amount: string) => `${label} · ${amount}`,
    saveChanges: "Guardar cambios", saving: "Guardando…", close: "Cerrar",
    // F45-1 (revisión del PR #45): cerrar tras un fallo ambiguo. Copy nuevo para revisión de los fundadores.
    uncertain: { title: "¿Cerrar sin confirmar?", description: "No pudimos confirmar si se guardó. Revisa Actividad antes de volver a anotarlo.", retry: "Reintentar", close: "Cerrar" },
    discard: { expense: "¿Descartar este gasto?", income: "¿Descartar este ingreso?", edit: "¿Descartar los cambios?", description: "Lo que escribiste no se guardará.", keep: "Seguir editando", confirm: "Descartar" },
    saved: { expense: "Gasto guardado", income: "Ingreso guardado", edit: "Cambios guardados" },
    undo: "Deshacer", undone: { expense: "Gasto deshecho", income: "Ingreso deshecho" },
    undoFailed: "No pudimos deshacer.", undoChanged: "No se pudo deshacer porque el movimiento cambió. Puedes eliminarlo desde su detalle.",
    retry: "Reintentar", reload: "Recargar",
    errors: {
      amountInvalid: "Escribe el monto en pesos enteros.", amountOutOfRange: "Escribe un monto entre $1 y $999.999.999.",
      category: "Elige una categoría para este movimiento.", date: "Elige una fecha válida.", descriptionTooLong: "Usa hasta 140 caracteres en la descripción.",
    },
  },
  // 003 T007: claves del contrato de errores. PR B (T035; 04·15, 04·17): Mi pareja M1–M7, invitación y confirmación de
  // anular. Copy nuevo para revisión de los fundadores en el PR; «propietaria» sigue a los comps y al glosario §1.
  couple: {
    // PR C de la 003 (04·1 INICIO · NOSOTROS, 04·6 SIN ACTIVIDAD; FR-044; interpretación I3).
    home: {
      spentIn: (month: string) => `En ${month} gastaron juntos`, pending: "POR SALDAR", settledBadge: "AL DÍA",
      owes: (debtor: string, creditor: string) => `${debtor} le debe a ${creditor}`, settled: "Al día", seeBalance: "Ver balance",
      balanceTitle: "Saldo de la pareja", recentTitle: "Recientes",
      empty: { title: "Aún no hay gastos este mes", description: "Cuando alguno de los dos anote un gasto compartido, aparecerá aquí con quién pagó y cómo se reparte.", action: "Anotar el primero" },
    },
    errors: { alreadyInCouple: "Ya tienes una pareja. Si tu invitación está pendiente, anúlala antes de aceptar otra.", invitationGone: "No encontramos esta invitación.", alreadyAccepted: "Ya no se puede anular: la invitación se aceptó.", notActive: "Necesitas una pareja activa para continuar.", versionConflict: "La invitación cambió en otro lugar. Ya ves lo último." },
    status: { active: "ACTIVA", pending: "PENDIENTE", solo: "SOLO TÚ", invalid: "NO VÁLIDA", label: (title: string) => `Estado de la pareja: ${title}` },
    active: {
      title: (owner: string, member: string) => `${owner} y ${member}`, line: "Pareja · 2 de 2 integrantes", members: "Integrantes",
      owner: "Propietaria", member: "Integrante", you: (role: string) => `Tú · ${role.toLowerCase()}`,
      howTitle: "Cómo funciona",
      how: {
        private: (partner: string) => `Lo que anotas en **Yo** es solo tuyo. ${partner} no lo ve, ni en totales.`,
        shared: "Lo que anotan en **Nosotros** lo ven los dos, con quién pagó y el reparto.",
        balance: "El balance y las metas compartidas viven en Nosotros, no aquí.",
        currency: "Los importes se registran en pesos colombianos (COP).",
      },
      leave: { title: "Salir de la pareja", description: "Por ahora no se puede salir de una pareja ni cambiar sus integrantes desde Juntia." },
    },
    none: {
      title: "Sin pareja", line: "Tu espacio personal funciona completo", heading: "Juntia también funciona solo",
      description: "Tu espacio personal está completo. Cuando quieras, invita a tu pareja para anotar gastos compartidos, ver el balance y ahorrar para metas juntos.",
      invite: "Invitar a mi pareja", invited: "Si te invitaron, abre el enlace que te enviaron.",
    },
    pending: {
      title: "Invitación enviada", line: (email: string, date: string) => `Para ${email} · vence\u00A0el\u00A0${date}`, expiredLine: (email: string, date: string) => `Para ${email} · venció\u00A0el\u00A0${date}`,
      description: "Cuando tu pareja abra el enlace y acepte, aparecerá aquí. Hasta entonces, todo sigue en tu espacio personal.",
      expiredDescription: "El enlace venció. Genera uno nuevo para volver a invitar; el correo sigue siendo el mismo.",
      regenerate: "Generar enlace nuevo", cancel: "Anular",
    },
    invite: {
      title: "Invitar a mi pareja", regenerateTitle: "Enlace nuevo",
      lead: "La invitación queda asociada a su correo. Solo podrá aceptarla con una cuenta verificada con ese correo.",
      readyLead: "Comparte el enlace con tu pareja por donde prefieran, por ejemplo WhatsApp.",
      regenerateLead: "El enlace anterior deja de funcionar al generar este. Comparte el nuevo con tu pareja.",
      email: "Correo de tu pareja", emailPlaceholder: "nombre@correo.com",
      rules: { expiry: "Vence a los 7 días. Solo puede haber una invitación activa.", role: "Se une como integrante. Tú quedas como propietaria.", private: "No verá lo que anotaste en Yo." },
      create: "Crear invitación", creating: "Creando…", generating: "Generando enlace…",
      ready: "Enlace listo", readyLine: (date: string) => `Un solo uso · vence\u00A0el\u00A0${date}`, link: "Enlace de invitación",
      once: "Este enlace solo se muestra ahora. Si lo pierdes, genera uno nuevo desde Mi pareja.",
      // F55-6: el resultado confirmado ya no es la invitación vigente (otra pestaña la cambió) o no se pudo comprobar.
      changed: "La invitación cambió desde otro lugar o no pudimos comprobar que siga vigente. Revisa Mi pareja y, si hace falta, genera un enlace nuevo.",
      share: "Compartir enlace", copy: "Copiar enlace", copied: "Enlace copiado.", shareText: "Te invito a ser mi pareja en Juntia.",
      errors: { email: "Escribe un correo válido, distinto del tuyo." },
    },
    cancel: {
      title: "¿Anular la invitación?", description: "El enlace dejará de funcionar. Si tu pareja ya lo abrió, no podrá aceptarlo. Puedes crear otro cuando quieras.",
      keep: "Mantener", confirm: "Anular invitación", cancelling: "Anulando…",
      failed: "No se anuló. El enlace sigue activo. Inténtalo de nuevo.", done: "Invitación anulada.",
    },
    invitation: {
      pageTitle: "Invitación", invalid: "Esta invitación ya no sirve", loading: "Revisando la invitación…",
      signedOut: { title: "Tienes una invitación a Juntia", description: "Para verla, entra o crea tu cuenta con el correo al que te invitaron. Después volverás aquí.", signIn: "Entrar", signUp: "Crear cuenta", note: "Antes de entrar no mostramos quién invita ni datos de la pareja." },
      valid: {
        title: (name: string) => `${name} te invitó a ser su pareja en Juntia`,
        shared: "Verán juntos lo que anoten en **Nosotros**: gastos, balance y metas compartidas.",
        private: "Lo que anotes en **Yo** sigue siendo solo tuyo.",
        money: "Juntia no mueve dinero: registra quién pagó y cuánto le toca a cada uno.",
        line: (email: string, date: string) => `Invitación para ${email} · vence\u00A0el\u00A0${date}.`,
        accept: "Aceptar invitación", accepting: "Aceptando…", later: "Ahora no",
      },
      invalidDescription: "Puede haber vencido, ya se usó, se anuló o es para otro correo. Pide un enlace nuevo a quien te invitó.",
      invalidNote: "Tampoco se puede aceptar si ya tienes una pareja activa o si la pareja ya tiene dos integrantes.",
      ownPending: "Tienes una invitación tuya pendiente. Para aceptar esta, primero anula la tuya en Mi pareja.",
      home: "Ir a mi espacio", toPartner: "Ir a Mi pareja",
    },
  },
  // PR B (T031b; FR-056, FR-059; contracts/server-actions.md §1): resultado desconocido de una escritura compartida.
  writes: {
    unknown: "No pudimos confirmar si se hizo. No lo des por hecho: reintenta lo mismo sin riesgo o comprueba el estado.",
    retry: "Reintentar", check: "Comprobar estado", checking: "Comprobando…",
    notFound: "Todavía no consta. Reintentar es seguro: no se hace dos veces.",
    // F57-4: «Deshacer» sin respuesta (red, 15 s o respuesta perdida). Nunca dice que no se deshizo.
    undoUnknown: "No pudimos confirmar si se deshizo. No lo des por hecho: comprueba el estado o reintenta sin riesgo.",
    // F57-6: el aviso de un deshacer sin confirmar no caduca; cerrarlo es explícito y se confirma.
    // F57-8: un deshacer pendiente a la vez (decisión del gestor). Copy nuevo para revisión de los fundadores.
    undoBlocked: "Resuelve primero el deshacer pendiente.",
    dismiss: "Cerrar aviso", undoCloseDescription: "No pudimos confirmar si se deshizo. Revisa Actividad antes de volver a intentarlo.",
    close: { title: "¿Cerrar sin confirmar?", description: "No pudimos confirmar si se hizo. Revisa Mi pareja antes de volver a intentarlo.", keep: "Seguir aquí", confirm: "Cerrar" },
  },
  // PR C de la 003 (T046–T050; 02·5 y 02·6 con la opción 2a de «07 Nosotros en Anotar gasto», 04·1, 04·7, 04·10). Copy
  // nuevo para revisión de los fundadores en el PR; los textos de los comps se copian tal cual.
  shared: {
    errors: {
      // F69-2 (revisión del PR #69): neutrales, como F68-1. La lectura no dice quién cambió o eliminó el gasto (puede ser la
      // pareja u otra pestaña de quien mira): no se atribuye. Para aprobación de los fundadores en T069.
      versionConflict: "Este gasto cambió en otro lugar. Revisa su estado antes de intentarlo de nuevo.", alreadyDeleted: "Este gasto ya se eliminó.",
      notActive: "Necesitas una pareja activa para anotar en Nosotros.",
    },
    context: "Contexto del gasto",
    mode: { equal: "50/50", percent: "Porcentaje", amount: "Importe", percentOf: ([first, second]: readonly number[]) => `${first}/${second}` },
    summary: {
      open: "Reparto",
      paid: (name: string, mode: string) => `Pagó ${name} · ${mode}`,
      // Decisión 4 tal como la dibuja el comp 02·5 N3 (2a oficial): «Pagó Tomás · 100 %» sobre «Sara · $186.400».
      single: (payer: string) => `Pagó ${payer} · 100 %`, one: (name: string, amount: string) => `${name} · ${amount}`,
      both: (first: string, second: string) => `${first} y ${second}`,
      each: (names: string, amount: string) => `${names} · ${amount} cada uno`,
      parts: (parts: readonly (readonly [string, string])[]) => parts.map(([name, amount]) => `${name} ${amount}`).join(" · "),
    },
    split: {
      title: "Reparto", back: "Volver al gasto", subtitle: (category: string, amount: string) => `${category} · ${amount}`,
      payer: "Pagó", mode: "Reparto", participants: "Participan", you: "(tú)",
      percentOf: (name: string) => `Porcentaje de ${name}`, amountOf: (name: string) => `Importe de ${name}`,
      notParticipating: "No participa", bar: "Cómo se reparte el gasto",
      singleNote: (name: string) => `${name} asume el 100 %. El reparto vuelve al añadir a la otra persona.`,
      missing: (amount: string) => `Faltan ${amount} por asignar`, excess: (amount: string) => `Sobran ${amount}`,
      missingPercent: (amount: string, percent: number) => `Faltan ${amount} (${percent} %)`, excessPercent: (amount: string, percent: number) => `Sobran ${amount} (${percent} %)`,
    },
    row: {
      meta: (payer: string, mode: string) => `Pagó ${payer} · ${mode}`, table: (payer: string, mode: string) => `${payer} · ${mode}`,
      settlement: "Liquidado · no es un gasto", settlementTitle: (from: string, to: string) => `${from} → ${to}`,
      accessibleName: ({ title, amount, category, date, meta }: { title: string; amount: string; category: string; date: string; meta: string }) => `${title}, ${amount} pesos, ${category}, ${meta}, ${date}`,
    },
    detail: {
      context: "Nosotros", payer: "Pagó", split: "Reparto", owed: "A quién le corresponde",
      notedBy: (author: string, payer: string) => `Anotado por ${author} · pagó ${payer}`,
      editedBy: (name: string, date: string) => `Editado por ${name} · ${date}`,
      owesLine: (debtor: string, creditor: string, amount: string) => `En este gasto, ${debtor} le debe ${amount} a ${creditor}. Ya está incluido en el balance.`,
      evenLine: "En este gasto cada uno pagó lo que le corresponde.",
    },
    edit: { notice: (name: string) => `Si cambias el monto o el reparto, el balance del mes se recalcula y ${name} verá que lo editaste.` },
    remove: { description: (title: string, amount: string, partner: string) => `${title} · ${amount}. Sale de los totales de Nosotros y del balance. ${partner} verá que lo eliminaste.` },
  },
  move: {
    errors: { notAllowed: "No se puede mover este gasto.", undoNotAvailable: "Ya no se puede deshacer: pasó el plazo o hay cambios posteriores." },
    limit: "No se puede mover este gasto porque está financiado con una meta.",
    action: "Mover a Pareja", explain: (partner: string) => `Pasa a Nosotros con ${partner}. Se crea el gasto compartido y este se anula: sigue habiendo un solo gasto.`,
    lead: "Revisa cómo queda en Nosotros. Nada cambia hasta que confirmes.",
    amount: "Importe", payer: "Pagó", kept: "Se mantiene", review: "Revisar cambios", back: "Volver",
    preview: {
      eyebrow: "Antes de mover", title: (month: string) => `Así cambian los números de ${month}`,
      private: "Tus gastos privados · Yo", sharedPart: "Tu parte compartida · Yo", couple: "Gasto compartido · Nosotros",
      owes: (debtor: string, creditor: string) => `${debtor} le debe a ${creditor}`, settled: "Saldo de la pareja",
      row: (label: string, before: string, after: string) => `${label}: antes ${before}, después ${after}`,
      paidNote: (payer: string, amount: string, share: string) => `${payer} pagó ${amount} y le corresponden ${share}.`,
      visibility: (partner: string, title: string) => `${partner} verá ${title} en Nosotros. El registro privado anulado queda solo en tu historial.`,
      atomic: "Es una sola operación: se crea el compartido y se anula el privado a la vez. Si algo falla, no cambia nada.",
      loading: "Calculando los cambios…", failed: "No pudimos calcular los cambios. Revisa tu conexión e inténtalo de nuevo.",
    },
    confirm: "Mover a Pareja", moving: "Moviendo…",
    donePrefix: "Movido a Pareja", done: (debtor: string, creditor: string, amount: string) => `Movido a Pareja. ${debtor} ahora le debe ${amount} a ${creditor}.`, doneSettled: "Movido a Pareja. Quedan al día.",
    undone: "Volvió a Yo.", undoFailed: "No pudimos deshacer el movimiento.",
    rejected: (title: string) => `No se movió. ${title} sigue en Yo y no se creó nada en Nosotros.`,
    movedFromMe: "movido desde Yo",
  },
  remove: {
    action: { expense: "Eliminar gasto", income: "Eliminar ingreso" }, title: { expense: "¿Eliminar este gasto?", income: "¿Eliminar este ingreso?" },
    description: (title: string, amount: string) => `${title} · ${amount}. Sale de tus totales, de Actividad y de la exportación.`,
    cancel: "Cancelar", confirm: "Eliminar", deleting: "Eliminando…", done: { expense: "Gasto eliminado", income: "Ingreso eliminado" },
    failed: "No pudimos eliminar. Revisa tu conexión.", backToActivity: "Ir a Actividad",
  },
  categories: { market: "Mercado", restaurants: "Restaurantes", home: "Hogar", transport: "Transporte", health: "Salud", entertainment: "Ocio", shopping: "Compras", services: "Servicios", office: "Oficina", clothing: "Ropa", income: "Ingresos", other: "Otra" },
  errors: { sessionExpired: "Tu sesión caducó. Vuelve a entrar para continuar.", unexpected: "Algo salió mal. Inténtalo de nuevo.", saveFailed: "No pudimos guardar. Revisa tu conexión.", network: "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo." },
  transaction: { errors: { notFound: "No encontramos este movimiento.", versionConflict: "Este movimiento cambió en otro lugar. Recárgalo para ver lo último.", alreadyDeleted: "Este movimiento ya se eliminó." } },
  // P0-1, PR B (04·17). Copy nuevo para revisión de los fundadores en el PR.
  auth: {
    back: "Volver",
    fields: { email: "Correo", password: "Contraseña", showPassword: "Mostrar contraseña", hidePassword: "Ocultar contraseña" },
    verifyEmail: { title: "Verifica tu correo", description: "Si podemos completar el registro, recibirás un enlace. Revisa tu correo o inténtalo más tarde.", resent: "Si podemos enviar el enlace, lo recibirás en tu correo. Si no llega, inténtalo más tarde.", spam: "Si no llega en unos minutos, revisa la carpeta de spam.", resend: "Reenviar enlace", resending: "Reenviando…", backToSignIn: "Volver a entrar" },
    signIn: {
      titleLead: "Lo tuyo, lo mío y", titleEmphasis: "lo nuestro.", submit: "Entrar", submitting: "Entrando…", forgot: "Olvidé mi contraseña", createAccount: "Crear cuenta", resend: "Reenviar enlace",
      invalidCredentials: "Correo o contraseña incorrectos.", notVerified: "Verifica tu correo antes de entrar.", verified: "Tu correo está verificado. Ya puedes entrar.", signedOut: "Cerraste sesión en este dispositivo.",
      missing: "Escribe tu correo y tu contraseña.",
    },
    networkError: "No pudimos conectar. Inténtalo de nuevo.",
    recover: { title: "Recupera tu acceso", description: "Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.", submit: "Enviar enlace", submitting: "Enviando…", sent: "Si podemos enviar el enlace, lo recibirás en tu correo. Si no llega, inténtalo más tarde.", linkExpired: "Este enlace caducó o ya se usó. Pide uno nuevo.", missing: "Escribe tu correo.",
      // Aprobado el 5 nov 2026 (Alejandro): enlace de recuperación de la plantilla por defecto abierto en otro navegador.
      otherBrowser: "Abre el enlace en el mismo navegador donde lo pediste o pide uno nuevo." },
    newPassword: { title: "Crea una contraseña nueva", label: "Contraseña nueva", repeat: "Repítela", repeatPlaceholder: "Repite la contraseña", help: "Usa al menos 8 caracteres.", mismatch: "Las dos contraseñas no coinciden.", submit: "Guardar contraseña", submitting: "Guardando…", weak: "Usa una contraseña de al menos 8 caracteres.", same: "Elige una contraseña distinta de la anterior." },
    signUp: {
      title: "Crea tu cuenta", nameLabel: "¿Cómo quieres que te llamemos?", nameHelp: "Así te saludamos y así te verá tu pareja.", namePlaceholder: "Ej.: Alejandro", passwordPlaceholder: "Crea una contraseña", passwordHelp: "Al menos 8 caracteres. Usa una que no uses en otro sitio.",
      // Q9 / FR-025: aviso de versión privada de prueba, sin enlaces ni texto legal inventado.
      notice: "Juntia es una versión privada de prueba. Todavía no tiene términos de uso publicados.", acknowledge: "Entiendo que es una versión privada de prueba.",
      submit: "Crear cuenta", submitting: "Creando cuenta…", haveAccount: "Ya tengo cuenta", weakPassword: "Usa una contraseña de al menos 8 caracteres.", missing: "Completa los tres campos y confirma el aviso.",
    },
    firstEntry: { howToStart: "Cómo quieres empezar", inviteTitle: "Invitar a mi pareja", inviteDescription: "Crea un enlace de un solo uso.", greeting: (name: string) => `Hola, ${name}`, description: "Tu espacio personal ya está listo.", startTitle: "Empezar por mi cuenta", startDescription: "Anota tus gastos e ingresos. Lo que anotas es solo tuyo.", noBudget: "No te pedimos un presupuesto. Si te sirve, podrás crearlo después en Plan.", continue: "Continuar", continuing: "Entrando…" },
  },
  empty: {
    home: { title: "Tu día a día, aquí", description: "Este será el lugar para ver tus movimientos." },
    activity: { title: "Todavía no hay movimientos", description: "Aquí podrás revisar lo que registres." },
    goals: { title: "Un lugar para tus metas", description: "Aquí podrás seguir lo que quieres construir." },
    plan: { title: "Planifica a tu manera", description: "Los presupuestos serán opcionales. Podrás registrar gastos sin crear uno." },
  },
  // PR D de la 003 (T061–T064; 02·3 Shared Balance, 04·2 BALANCE COMPARTIDO y REGISTRAR LIQUIDACIÓN, 04·7 módulo de
  // escritorio; MOTION_SYSTEM §3). «le debe», nunca «está en deuda»; «Liquidado», nunca «Pagado» (glosario §9). Copy nuevo
  // para revisión de los fundadores en el PR.
  balance: { title: "Todavía no disponible", description: "El balance aparece cuando exista la pareja.",
    pending: "POR SALDAR", settledBadge: "LIQUIDADO",
    owes: (debtor: string, creditor: string) => `${debtor} le debe a ${creditor}`, settled: "Al día",
    cumulative: "Es el saldo acumulado desde que son pareja; el desglose va mes a mes.",
    owed: (amount: string) => `Le deben ${amount}`, owesShort: (amount: string) => `Debe ${amount}`, even: "Al día",
    paidLine: (paid: string, share: string) => `Pagó ${paid} · le corresponden ${share}`,
    bar: ({ name, paid, share, status, settledOut, settledIn }: { name: string; paid: string; share: string; status: string; settledOut: string | null; settledIn: string | null }) =>
      [`${name} pagó ${paid}`, `le corresponden ${share}`, ...(settledOut ? [`liquidó ${settledOut}`] : []), ...(settledIn ? [`recibió ${settledIn}`] : []), status].join("; "),
    barStatus: { owed: (amount: string) => `le deben ${amount}`, owes: (amount: string) => `debe ${amount}`, even: "al día" },
    legend: { label: "Cómo se leen las barras", share: "le corresponde", over: "puso de más", missing: "le falta", received: "recibió", settled: "liquidó" },
    moduleCaption: "Barra: lo que pagó cada uno. Marca: lo que le corresponde.",
    settledNote: "La liquidación cambia el balance, pero no cuenta como gasto.",
    empty: { title: "Todavía no hay gastos compartidos", description: "Cuando anoten el primero, aquí verán quién pagó, cuánto le corresponde a cada uno y quién le debe a quién." },
    loading: "Cargando el balance",
    error: { title: "No pudimos cargar el balance", description: "Lo que anotaron sigue a salvo. Revisa tu conexión e inténtalo de nuevo.", retry: "Reintentar" },
    actions: { settle: "Registrar liquidación", breakdown: "Desglose" },
    inMe: { title: "El balance está en Nosotros", description: "Es de los dos. Cambia a Nosotros para ver quién le debe a quién." },
    breakdown: {
      title: (month: string) => `Desglose de ${month}`, caption: (month: string) => `De dónde sale el saldo: gastos compartidos de ${month}`,
      expense: "Gasto", payer: "Pagó · reparto", amount: "Monto", partOf: (name: string) => `Parte de ${name}`,
      total: "Gasto compartido del mes", empty: (month: string) => `En ${month} no hay gastos compartidos.`,
    },
    settlements: {
      title: (month: string) => `Liquidaciones de ${month}`, note: "Las liquidaciones no son gastos: no suman al consumo ni a las categorías.", empty: (month: string) => `En ${month} no registraron liquidaciones.`,
      registered: (date: string) => `registrada el ${date}`, voided: "Anulada",
      accessibleName: (title: string, amount: string, meta: string) => `${title}, ${amount} pesos, ${meta}`,
    },
    settle: {
      title: "Registrar liquidación",
      direction: (debtor: string, creditor: string) => `${debtor} le pagó a ${creditor}`,
      pending: (amount: string) => `Saldo pendiente: ${amount} · puedes registrar un pago parcial`,
      options: "Cuánto registrar", all: "Todo", other: "Otro", otherAmount: "Monto de la liquidación",
      date: "Fecha", note: "Nota (opcional)",
      afterAll: "Después de esto quedan al día.",
      afterPartial: (debtor: string, creditor: string, amount: string) => `Después de esto, ${debtor} le debe ${amount} a ${creditor}.`,
      disclaimer: "Esto anota un pago que ya hicieron por fuera, en efectivo o por transferencia. Juntia no mueve dinero y la liquidación no cuenta como gasto.",
      submit: (amount: string) => `Registrar ${amount}`, submitting: "Registrando…",
      done: "Liquidación registrada", undone: "Liquidación deshecha",
      announceSettled: (first: string, second: string) => `Liquidación registrada. ${first} y ${second} quedan al día.`,
      announcePending: (debtor: string, creditor: string, amount: string) => `Liquidación registrada. ${debtor} le debe ${amount} a ${creditor}.`,
      rejected: "No se registró la liquidación.",
      errors: { nothingToSettle: "No hay saldo pendiente por saldar.", exceedsPending: (maximum: string) => `Puedes registrar hasta ${maximum}.`, date: "Elige una fecha de hoy o pasada.",
        // Revisión del gestor del PR #60 (3): el servidor rechazó por el saldo; el pendiente que se ve puede ser viejo.
        changed: "El saldo cambió mientras registrabas. Revisa el saldo pendiente y vuelve a intentarlo.", amount: "Escribe un monto en pesos enteros mayor que cero.", noteTooLong: "Usa hasta 140 caracteres en la nota." },
    },
    settlement: {
      title: "Liquidación", date: "Fecha", note: "Nota",
      by: (name: string, date: string) => `Registrada por ${name} · ${date}`, voidedBy: (name: string, date: string) => `Anulada por ${name} · ${date}`,
      voidedBadge: "ANULADA",
      void: {
        action: "Anular liquidación", title: "¿Anular esta liquidación?",
        description: (title: string, amount: string) => `${title} · ${amount}. Sale del saldo y queda en el historial como anulada. No se borra.`,
        keep: "Cancelar", confirm: "Anular", loading: "Anulando…", done: "Liquidación anulada", rejected: "No se anuló: el saldo sigue igual.",
        closeUnconfirmed: "No pudimos confirmar si se anuló. Revisa la liquidación en Balance antes de volver a intentarlo.",
      },
      errors: { notFound: "No encontramos esta liquidación.", alreadyVoided: "Esta liquidación ya se anuló.", versionConflict: (name: string) => `${name} cambió esta liquidación antes. Ya ves lo último.` },
    },
  },
  // P0-1, PR B (02·9–02·10, 04·14–04·19). Copy nuevo para revisión de los fundadores en el PR.
  account: {
    title: "Mi cuenta", withPartner: (name: string) => `Mi cuenta · con ${name}`, back: "Volver", signInAgain: "Entrar de nuevo", sections: "Secciones de Mi cuenta", editProfile: "Editar perfil",
    groups: { mySpace: "Mi espacio", preferences: "Preferencias", privacySecurity: "Privacidad y seguridad" },
    menu: {
      profile: "Mi perfil", profileHint: "Nombre visible", partner: "Mi pareja",
      // PR B (T034): la fila de Mi pareja dice el estado real.
      partnerNone: "Invita a tu pareja", partnerPending: "Invitación pendiente", partnerActive: (name: string) => `Con ${name} · activa`,
      appearance: "Apariencia", privacy: "Privacidad y datos", privacyHint: "Qué es solo tuyo, exportar", security: "Seguridad y sesión", securityHint: "Contraseña y esta sesión",
    },
    signOut: { label: "Cerrar sesión", hint: "No borra nada: vuelves a entrar con tu correo.", loading: "Cerrando sesión…" },
    profile: {
      title: "Mi perfil", avatarNote: "Tu avatar usa tu inicial y el color que Juntia te asigna.", nameLabel: "¿Cómo quieres que te llamemos?", nameHelp: "Así te saludamos y así te verá tu pareja.", namePlaceholder: "Ej.: Alejandro",
      emailLabel: "Correo de acceso", emailHelp: "No se puede cambiar desde Juntia.", authorshipNote: "Cambiar tu nombre no cambia quién registró cada movimiento.",
      save: "Guardar cambios", cancel: "Cancelar", saved: "Perfil actualizado.", saveFailed: "No se guardó. Revisa tu conexión e inténtalo de nuevo. Tus cambios siguen aquí.",
      errors: { displayName: "Escribe un nombre de 1 a 60 caracteres, sin saltos de línea." },
    },
    partner: { title: "Mi pareja" },
    appearance: { title: "Apariencia", label: "Apariencia", light: "Claro", dark: "Oscuro", system: "Sistema", help: "Sistema sigue la configuración de tu dispositivo. El cambio es inmediato." },
    privacy: {
      title: "Privacidad y datos", whoSees: "Qué ve cada uno", onlyYou: "Solo tú", onlyYouItems: ["Los gastos e ingresos que anotas", "Tu nombre visible y tu correo de acceso"],
      partnerLater: "Cuando invites a tu pareja, aquí verás qué comparten y qué sigue siendo solo tuyo.", yourData: "Tus datos",
      export: "Exportar mis datos", exportHint: "JSON y CSV con tus movimientos, metas y presupuestos",
      deleteTitle: "Eliminar tu cuenta", deleteDescription: "La solicitud de eliminación todavía no está disponible en la app. Nada se borra sin que lo confirmes.",
      // 005 · PR B (T061; FR-067, contrato de borrado §8): cómo pedirla. Redacción para aprobar por los fundadores (T067).
      deleteHowTo: "Para pedirla, escribe a quien administra Juntia. Te pedirá que confirmes por escrito y solo después la hará a mano; si compartes datos con tu pareja, cada persona confirma por su cuenta.",
    },
    // 004 PR E (T076; FR-080, FR-081; I4): «qué incluye» dice el alcance que el PR A dio al archivo. Copy para los fundadores.
    export: {
      title: "Exportar mis datos", format: "Formato", json: "JSON", jsonHint: "Tus datos, separados por tipo de registro.", csv: "CSV", csvHint: "Todo en una tabla: una fila por registro, con su tipo y su contexto (Yo o Nosotros).",
      includes: "Incluye lo que ves en Juntia: tus movimientos, los gastos compartidos con su reparto, las liquidaciones, tus metas y las compartidas con sus aportes, y los presupuestos de Yo y de Nosotros.", excludes: "Nunca incluye lo privado de tu pareja (sus gastos, metas y presupuestos personales) ni datos internos.", notRestore: "Es una copia para consultar. No sirve para restaurar ni migrar automáticamente.",
      close: "Cerrar", prepare: "Preparar archivo", preparing: "Preparando…", ready: "Archivo listo.", download: "Descargar",
      failedLead: "No se pudo preparar.", failed: "No se descargó nada. Inténtalo de nuevo.", retry: "Reintentar",
    },
    security: {
      title: "Seguridad y sesión", password: "Contraseña", change: "Cambiar contraseña", changeHint: "Te enviaremos un enlace seguro a tu correo.", changing: "Enviando enlace…",
      sentHint: "Te enviamos un enlace seguro a tu correo.", sent: (email: string) => `Revisa ${email}. El enlace sirve una vez.`,
      thisSession: "Esta sesión", sessionNote: "Sesión iniciada en este dispositivo. Al cerrarla, Juntia borra lo que tenía guardado aquí.",
      signOutFailed: "No pudimos cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.",
    },
  },
  // P0-1, PR C (04·1, 04·6, 04·7, 04·16). Copy nuevo para revisión de los fundadores en el PR.
  dates: {
    months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    monthsShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    weekdays: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    today: "Hoy", yesterday: "Ayer",
  },
  row: {
    onlyYou: "Solo tú",
    // UX lote 1, cambio 3 (fila optimista; copy aprobado por los fundadores el 6 nov 2026): no afirma que se guardó.
    pending: { saving: "Guardando…" },
    // PR C de la 003 (04·1 INICIO · YO): la fila de un gasto compartido en Yo; cuenta solo por la parte.
    sharedPart: (amount: string) => `Compartido · tu parte ${amount}`,
    accessibleName: ({ title, amount, income, category, date }: { title: string; amount: string; income: boolean; category: string; date: string }) =>
      `${title}, ${income ? "más " : ""}${amount} pesos, ${category}, ${date}`,
  },
  home: {
    greeting: (name: string) => `Hola, ${name}`,
    spentIn: (month: string) => `En ${month} gastaste`,
    noExpenses: (month: string) => `En ${month} todavía no anotas gastos`,
    dateLine: (date: string, left: number) => `${date} · ${left === 0 ? "último día del mes" : left === 1 ? "queda 1 día del mes" : `quedan ${left} días del mes`}`,
    annotateHint: "Monto y categoría",
    breakdownTitle: "En qué se fue", recentTitle: "Tus movimientos", seeAll: "Ver todo",
    // 004 PR E (T075; FR-021; Q5): de «En qué se fue» al análisis del mes.
    analysis: "Ver el análisis",
    // PR C de la 003 (04·1 INICIO · YO; FR-045): `gasto_consumo` de Yo, privados más la parte compartida.
    onlyYours: "Solo tuyos", sharedPart: "Tu parte compartida",
    empty: { title: "Todavía no anotas nada este mes", description: "Cuando anotes un gasto o un ingreso, aquí verás cuánto llevas y en qué se fue. Solo tú lo ves.", action: "Anotar el primero" },
    loading: "Cargando movimientos",
  },
  us: { title: "Todavía no disponible", description: "Nosotros aparece cuando exista la pareja. Por ahora, lo que anotas es solo tuyo y lo ves en Yo.",
    // PR B (T034; FR-016, US-3.7): el acceso a invitar desde Nosotros sin pareja. Los textos de pendiente y activa cubren
    // el tiempo entre el PR B y el PR C, que trae los gastos compartidos. Copy nuevo para revisión de los fundadores.
    invite: "Invitar a mi pareja", pendingDescription: "Tu invitación está pendiente. Nosotros aparece cuando tu pareja la acepte.", seeInvitation: "Ver mi invitación",
    // PR C: Nosotros ya tiene gastos compartidos en Inicio y Actividad; Metas y Plan siguen provisionales hasta P0-3 (FR-048).
    activeDescription: "Las metas y el plan de los dos llegan en una próxima versión. Los gastos compartidos ya están en Inicio y Actividad." },
  load: { error: { title: "No pudimos cargar tus movimientos", description: "Revisa tu conexión. Lo que ya estaba guardado sigue a salvo; sin conexión no podemos guardar nada nuevo." } },
  activity: {
    spentIn: (month: string) => `Gasto de ${month}`,
    monthTitle: (month: string, year: string) => `${month} ${year}`,
    count: (count: number) => (count === 1 ? "1 movimiento" : `${count} movimientos`),
    previousMonth: (label: string) => `Mes anterior: ${label}`, nextMonth: (label: string) => `Mes siguiente: ${label}`,
    searchLabel: "Buscar por descripción", searchPlaceholder: "Buscar", type: "Tipo", all: "Todos", expenses: "Gastos", incomes: "Ingresos",
    categoryFilter: "Filtrar por categoría", categoryChip: (category: string, amount: string) => `${category}, ${amount} pesos`,
    results: (count: number) => (count === 1 ? "1 movimiento coincide" : `${count} movimientos coinciden`),
    table: { caption: "Movimientos del mes", description: "Descripción", date: "Fecha", amount: "Monto", paidSplit: "Pagó · Reparto",
      // F07 (auditoría Impeccable, nov 2026): un aporte en la tabla de escritorio, en la columna «Pagó · Reparto».
      goalContribution: (name: string) => `${name} · aporte` },
    // PR C de la 003 (04·1 ACTIVIDAD en Nosotros, 04·6 SIN ACTIVIDAD).
    spentTogether: (month: string) => `Gasto compartido de ${month}`,
    // F57-7: el resumen del mes dice que hay gastos y la lista llegó vacía. Copy nuevo para revisión de los fundadores.
    coupleStale: { text: "La lista de este mes no se cargó completa. Vuelve a cargarla para ver los gastos.", action: "Volver a cargar" },
    coupleEmpty: { title: "Aún no hay gastos este mes", description: "Cuando alguno de los dos anote un gasto compartido, aparecerá aquí con quién pagó y cómo se reparte.", action: "Anotar el primero" },
    empty: { title: "Aún no hay movimientos este mes", description: "Cuando anotes un gasto o un ingreso con fecha de este mes, aparecerá aquí. Solo tú lo ves.", action: "Anotar el primero" },
    noResults: { title: "Nada coincide", description: "Prueba con otra palabra o quita los filtros.", clear: "Quitar filtros" },
    loading: "Cargando movimientos",
  },
  detail: {
    expense: "Gasto", income: "Ingreso", panel: "Detalle del movimiento", back: "Volver a Actividad", close: "Cerrar detalle",
    category: "Categoría", date: "Fecha", context: "Contexto", contextValue: "Yo · solo tú", edit: "Editar",
    noted: (date: string, edited: boolean) => `Anotado el ${date} · ${edited ? "con ediciones" : "sin ediciones"}`,
    notFound: { title: "No encontramos este movimiento", description: "Puede que se haya eliminado o que no sea tuyo. En Actividad están todos tus movimientos." },
    pick: { title: "Elige un movimiento", description: "Su detalle aparece aquí, junto a la lista." },
  },
  // 004 PR E (respuesta del gestor a la pregunta 2 del PR #71): desde el PR A el archivo lleva más que los movimientos. Solo texto.
  export: { fileNote: "Copia de consulta de lo que ves en Juntia: movimientos, gastos compartidos, liquidaciones, metas con sus aportes, retiros y usos, solicitudes de uso y presupuestos. No sirve para restaurar ni migrar automáticamente." },
  states: {
    notFound: "No encontramos esta página",
    notFoundDescription: "La dirección no existe o todavía no hace parte de esta versión. Desde Inicio puedes seguir recorriendo Juntia.",
    error: "No pudimos mostrar esta página",
    errorDescription: "Algo falló al dibujarla. Puedes intentarlo de nuevo o volver a Inicio.",
    retry: "Reintentar",
    home: "Ir a Inicio",
  },
  primitives: { loading: "Cargando…", saving: "Guardando…", close: "Cerrar", amount: "Monto", amountHelp: "Escribe el monto en pesos enteros.", amountError: "Revisa el monto y usa solo números.", pending: "POR SALDAR", settled: "LIQUIDADO", exceeded: "EXCEDIDO", nearLimit: "CERCA DEL LÍMITE", private: "PRIVADO" },
  // Solo la superficie interna (FR-050): rótulos de revisión y valores de prueba de COMPONENT_SPECIFICATIONS.md.
  internal: {
    title: "Superficie interna de revisión",
    note: "Valores de prueba para revisar los primitivos. No son datos financieros de una persona.",
    eyebrow: "Juntia · primitivos",
    light: "Claro",
    dark: "Oscuro",
    sections: { icon: "AppIcon", avatar: "Avatar", category: "CategoryIcon", badge: "Badge", button: "Button", input: "Input", amount: "AmountInput", segmented: "Segmented", skeleton: "Skeleton" },
    hints: {
      icon: "Phosphor en sus cuatro pesos. Regular en línea, Fill para lo activo, Bold dentro de botones, Duotone en fichas.",
      avatar: "Inicial sobre el color de persona. Sin patrón de tramo.",
      category: "Cuatro tamaños, las diez categorías y la forma según el tipo de fila. Es decorativo.",
      badge: "Siempre ícono más texto. «Por saldar» es neutro y punteado.",
      button: "Cuatro variantes y tres tamaños. Disabled y carga conservan el ancho.",
      input: "Etiqueta, ayuda, error que dice cómo corregir y disabled.",
      amount: "Teclado numérico, miles con punto, sin decimales, tope 999.999.999.",
      segmented: "Flechas ← → y foco itinerante. Con movimiento reducido la perilla salta.",
      skeleton: "Misma geometría que el contenido. Aparece pasados 300 ms; estático con movimiento reducido.",
    },
    weights: { regular: "Regular", fill: "Fill", bold: "Bold", duotone: "Duotone" },
    sizes: { sm: "sm · 32", md: "md · 40", lg: "lg · 48", xl: "xl · 64" },
    sizesLabel: "Tamaños",
    buttonSizes: { sm: "sm · 36", md: "md · 44", lg: "lg · 52" },
    shapes: { square: "Cuadrada · gasto o ingreso", saving: "Círculo · aporte", settlement: "Contorno · liquidación", selected: "Seleccionada" },
    categories: { market: "Mercado", restaurants: "Restaurantes", home: "Hogar", transport: "Transporte", health: "Salud", entertainment: "Ocio", shopping: "Compras", services: "Servicios", office: "Oficina", clothing: "Ropa", income: "Ingresos", other: "Otra" },
    persons: { first: "person.1", second: "person.2", firstInitial: "A", secondInitial: "B" },
    variants: { primary: "primary", secondary: "secondary", ghost: "ghost", danger: "danger" },
    states: { normal: "Normal", disabled: "Disabled", loading: "Carga" },
    actions: { add: "Agregar", primary: "Guardar", secondary: "Editar", ghost: "Cancelar", danger: "Eliminar", primaryLoading: "Guardando…", secondaryLoading: "Editando…", ghostLoading: "Cancelando…", dangerLoading: "Eliminando…" },
    input: { label: "Descripción", placeholder: "Escribe cómo lo reconoces", help: "Así lo reconoces en la lista.", error: "Escribe al menos dos letras para la descripción.", disabled: "Pagó", disabledValue: "Persona 1" },
    amount: { empty: "Vacío", max: "Tope 999.999.999", error: "Con error", long: "Importe largo en espacio angosto" },
    segmented: { radiogroup: "radiogroup · contexto", tablist: "tablist · reparto", split: "Reparto", even: "50/50", percent: "Porcentaje", fixed: "Importe" },
    skeleton: { row: "Filas de 60 con ficha de 40", card: "Tarjeta de meta de 228" },
  },
} as const;
