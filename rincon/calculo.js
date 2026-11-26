// Mi rincón de profe · motor de cálculo
// ------------------------------------------------------------------
// Funciones puras: reciben los datos (eventos de la agenda y colecciones
// de Mi rincón de profe) y devuelven lo que se muestra. No leen ni
// escriben en Firebase. Nada de lo que se calcula aquí se guarda.

/* ---------- copiadas tal cual de la agenda (index.html) ---------- */
// No cambiar sin cambiar también la agenda: deben dar el mismo resultado.
export const nameKey = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export function parseClass(title){
  const t = String(title || "").replace(/\s+/g, " ").trim();
  if (/\bworkshops?\b/i.test(t)) {
    const rest = t.replace(/\bworkshops?\b/ig, " ");
    const seen = new Set(), names = [];
    rest.split(/\s*(?:,|;|\/|\+|&|·|\s[-–—]\s|\sy\s|\se\s)\s*/i)
      .map(s => s.replace(/^[\s:·.\-–—()]+|[\s:·.\-–—()]+$/g, "").trim())
      .filter(Boolean)
      .forEach(n => { const k = nameKey(n); if (!seen.has(k)) { seen.add(k); names.push(n); } });
    return { kind: "workshop", names };
  }
  return { kind: "individual", names: t ? [t] : [] };
}
export const mins = t => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };

/* ---------- utilidades ---------- */
const pad = n => String(n).padStart(2, "0");
export const dayKey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const duracion = ev => Math.max(0, mins(ev.end) - mins(ev.start));
/** La clase ya ha terminado (igual que «Ya dadas» en la agenda). */
export function esPasada(ev, ahora){
  const hoy = dayKey(ahora), m = ahora.getHours() * 60 + ahora.getMinutes();
  return ev.date < hoy || (ev.date === hoy && mins(ev.end) <= m);
}
/** Identificador del documento de alias: único por academia y nombre normalizado. */
export const aliasId = (academiaId, texto) => academiaId + "~" + encodeURIComponent(nameKey(texto));
const porFecha = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : mins(a.inicio) - mins(b.inicio)) || (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0);
// Sin fecha de compra conocida: el pack cubre todas las clases del alumno en la agenda.
const inicioPack = p => p.fechaCompraDesconocida ? "0000-01-01" : (p.fechaInicio || p.fechaCompra);

export const ESTADOS_CLASE = {
  impartida:        { label: "Impartida",          cuenta: true },
  cancelada_cuenta: { label: "Cancelada (cuenta)", cuenta: true },
  cancelada:        { label: "Cancelada",          cuenta: false },
  recuperacion:     { label: "Recuperación",       cuenta: true }
};

/** Academia de un evento de la agenda según su tipo (por id), o null si no es de LSI ni de Irene. */
export function academiaDeEvento(ev, academias){
  for (const a of academias) if ((a.tiposAgenda || []).includes(ev.type)) return a.id;
  return null;
}

/** Eventos de la agenda que cuentan para Mi rincón de profe. */
export function eventosValidos(items, academias){
  return items.filter(i => i && i.kind === "event" && !i.example && i.date && i.start && i.end && academiaDeEvento(i, academias));
}

/** Miembros de un grupo en una fecha concreta. */
function miembrosEn(grupo, fecha){
  return (grupo.miembros || []).filter(m => (!m.desde || m.desde <= fecha) && (!m.hasta || m.hasta >= fecha)).map(m => m.alumnoId);
}

/**
 * Participantes de una clase.
 * Devuelve { academiaId, modalidad, alumnos: [alumnoId], sinVincular: [texto], avisos: [] }
 */
export function participantes(ev, ctx){
  const academiaId = academiaDeEvento(ev, ctx.academias);
  const reg = ctx.registros.get(ev.id);
  const avisos = [];
  let alumnos = [], sinVincular = [], esWorkshop = false;
  if (reg && Array.isArray(reg.participantes) && reg.participantes.length) {
    alumnos = [...new Set(reg.participantes)];
  } else {
    const p = parseClass(ev.title);
    esWorkshop = p.kind === "workshop";
    if (esWorkshop && !p.names.length) avisos.push("Workshop sin nombres en el título");
    for (const n of p.names) {
      const al = ctx.alias.get(aliasId(academiaId, n));
      if (!al) { sinVincular.push(n); continue; }
      if (al.tipo === "varios") {
        // Un título con varias personas («Alex- Joe»): cada una tiene su propia ficha.
        const ids = (al.alumnoIds || []).filter(Boolean);
        if (!ids.length) avisos.push(`«${n}» no apunta a ninguna ficha`);
        alumnos.push(...ids);
      } else if (al.tipo === "grupo") {
        const g = ctx.grupos.get(al.grupoId);
        const ms = g ? miembrosEn(g, ev.date) : [];
        if (!ms.length) avisos.push(`El grupo «${n}» no tiene miembros en esa fecha`);
        alumnos.push(...ms);
      } else if (al.alumnoId) alumnos.push(al.alumnoId);
    }
    alumnos = [...new Set(alumnos)];
  }
  const total = alumnos.length + sinVincular.length;
  const modalidad = total >= 3 ? "grupo" : total === 2 ? "pareja" : "individual";
  if (esWorkshop && total === 1) avisos.push("Workshop con un solo nombre");
  return { academiaId, modalidad, alumnos, sinVincular, avisos };
}

/**
 * Cálculo completo.
 * datos = { items, academias, alumnos, alias, grupos, packs, ajustesPack, registros, tarifas, config }
 *   items: documentos de agendas/principal/items (solo lectura)
 *   alias: Map(aliasId → doc) · grupos: Map(id → doc) · registros: Map(eventId → doc)
 *   alumnos, packs, ajustesPack, tarifas: arrays con id
 */
export function calcular(datos, ahora = new Date()){
  const umbral = Object.assign({ renovacion: 3, urgente: 1 }, datos.config && datos.config.umbrales);
  const ctx = { academias: datos.academias, alias: datos.alias, grupos: datos.grupos, registros: datos.registros };
  const alumnosById = new Map(datos.alumnos.map(a => [a.id, a]));
  const eventos = eventosValidos(datos.items, datos.academias);
  const eventosById = new Map(eventos.map(e => [e.id, e]));
  const avisos = [];
  const sinVincular = new Map();   // nameKey+academia → { texto, academiaId, eventos: [] }
  const consumos = [];             // uno por (evento, alumno)

  for (const ev of eventos) {
    const p = participantes(ev, ctx);
    p.avisos.forEach(t => avisos.push({ tipo: "clase", eventId: ev.id, fecha: ev.date, texto: t }));
    for (const n of p.sinVincular) {
      const k = aliasId(p.academiaId, n);
      const s = sinVincular.get(k) || { aliasId: k, texto: n, academiaId: p.academiaId, eventos: [] };
      s.eventos.push(ev.id); sinVincular.set(k, s);
    }
    const reg = datos.registros.get(ev.id);
    const pasada = esPasada(ev, ahora);
    for (const alumnoId of p.alumnos) {
      const r = (reg && reg.porAlumno && reg.porAlumno[alumnoId]) || {};
      const estado = ESTADOS_CLASE[r.estado] ? r.estado : "impartida";
      consumos.push({
        eventId: ev.id, alumnoId, academiaId: p.academiaId, modalidad: p.modalidad,
        fecha: ev.date, inicio: ev.start, fin: ev.end, minutos: duracion(ev), titulo: ev.title,
        estado, recuperaDe: r.recuperaDe || null, packForzado: r.packId || null, nota: r.nota || "",
        prevista: !pasada, cuenta: pasada && ESTADOS_CLASE[estado].cuenta, motivoNoCuenta: pasada ? (ESTADOS_CLASE[estado].cuenta ? null : "cancelada") : "prevista"
      });
      if (!alumnosById.has(alumnoId)) avisos.push({ tipo: "alias", eventId: ev.id, texto: "Un alias apunta a una ficha que ya no existe" });
    }
  }

  /* Recuperaciones: la clase original y su recuperación cuentan 1 en total. */
  const byKey = new Map(consumos.map(c => [c.eventId + "|" + c.alumnoId, c]));
  const recuperadas = new Set();
  for (const c of [...consumos].sort(porFecha)) {
    if (c.estado !== "recuperacion" || !c.cuenta) continue;
    const orig = c.recuperaDe ? byKey.get(c.recuperaDe + "|" + c.alumnoId) : null;
    if (!c.recuperaDe) { avisos.push({ tipo: "recuperacion", eventId: c.eventId, alumnoId: c.alumnoId, texto: "Recuperación sin clase original vinculada" }); continue; }
    if (!orig) { c.cuenta = false; c.motivoNoCuenta = "original_no_encontrada"; avisos.push({ tipo: "recuperacion", eventId: c.eventId, alumnoId: c.alumnoId, texto: "La clase original de esta recuperación no existe o no es de este alumno" }); continue; }
    const k = orig.eventId + "|" + c.alumnoId;
    if (recuperadas.has(k)) { c.cuenta = false; c.motivoNoCuenta = "recuperacion_duplicada"; avisos.push({ tipo: "recuperacion", eventId: c.eventId, alumnoId: c.alumnoId, texto: "Esa clase ya tiene otra recuperación" }); continue; }
    recuperadas.add(k);
    if (orig.cuenta) { c.cuenta = false; c.motivoNoCuenta = "original_ya_cuenta"; }
  }

  /* Registros que apuntan a clases que ya no están en la agenda. */
  for (const [eventId] of datos.registros) if (!eventosById.has(eventId)) avisos.push({ tipo: "huerfano", eventId, texto: "Hay un registro de una clase que ya no está en la agenda" });

  /* Posibles clases duplicadas en la agenda (mismo alumno, mismo día, horas que se solapan). */
  const porAlDia = new Map();
  for (const c of consumos) { const k = c.alumnoId + "|" + c.fecha; (porAlDia.get(k) || porAlDia.set(k, []).get(k)).push(c); }
  for (const list of porAlDia.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (mins(a.inicio) < mins(b.fin) && mins(b.inicio) < mins(a.fin))
        avisos.push({ tipo: "duplicado", eventId: b.eventId, alumnoId: a.alumnoId, fecha: a.fecha, texto: "Posible clase duplicada en la agenda" });
    }
  }

  /* Por alumno: packs, clases sueltas y contador de tarifa. */
  const ajustesPorPack = new Map();
  for (const aj of datos.ajustesPack || []) ajustesPorPack.set(aj.packId, (ajustesPorPack.get(aj.packId) || 0) + (Number.isInteger(aj.cantidad) ? aj.cantidad : 0));
  const consumosPorAlumno = new Map();
  for (const c of consumos) (consumosPorAlumno.get(c.alumnoId) || consumosPorAlumno.set(c.alumnoId, []).get(c.alumnoId)).push(c);
  const porAlumno = new Map();
  const hoy = dayKey(ahora);

  for (const al of datos.alumnos) {
    const lista = (consumosPorAlumno.get(al.id) || []).sort(porFecha);
    const packs = (datos.packs || []).filter(p => p.alumnoId === al.id)
      .sort((a, b) => (inicioPack(a) < inicioPack(b) ? -1 : inicioPack(a) > inicioPack(b) ? 1 : 0) || (a.fechaCompra < b.fechaCompra ? -1 : a.fechaCompra > b.fechaCompra ? 1 : 0) || ((a.creadoEn || 0) - (b.creadoEn || 0)));
    const est = packs.map(p => {
      const previas = p.consumidasPrevias && Number.isInteger(p.consumidasPrevias.clases) ? p.consumidasPrevias : null;
      return { pack: p, anulado: p.estadoManual === "anulado", inicio: inicioPack(p), corte: previas ? previas.hasta : null,
        disponibles: p.clasesContratadas + (ajustesPorPack.get(p.id) || 0), previas: previas ? previas.clases : 0, asignadas: [] };
    });
    const vivos = est.filter(e => !e.anulado);
    const restante = e => e.disponibles - e.previas - e.asignadas.length;
    const sueltas = [], sinPack = [], cubiertas = [], antesDePacks = [];
    for (const c of lista) {
      if (!c.cuenta) continue;
      // Clases anteriores al corte de un pack con «clases ya consumidas»: ya están en ese número.
      const cubre = vivos.find(e => e.corte && e.inicio <= c.fecha && c.fecha <= e.corte);
      if (cubre) { c.cubiertaPor = cubre.pack.id; cubiertas.push(c); continue; }
      let destino = null;
      if (c.packForzado) {
        destino = vivos.find(e => e.pack.id === c.packForzado && e.inicio <= c.fecha && restante(e) > 0) || null;
        if (!destino) avisos.push({ tipo: "pack", eventId: c.eventId, alumnoId: al.id, texto: "No se pudo usar el pack elegido para esta clase" });
      }
      if (!destino) destino = vivos.find(e => e.inicio <= c.fecha && (!e.corte || c.fecha > e.corte) && restante(e) > 0) || null;
      if (destino) { destino.asignadas.push(c); c.packId = destino.pack.id; }
      else if (al.modoPago === "por_clase") { c.suelta = true; sueltas.push(c); }
      // Clases anteriores al primer pack registrado: no se descuentan ni avisan (son de antes de usar Mi rincón de profe).
      else if (vivos.length && c.fecha < vivos[0].inicio) { c.antesDePacks = true; antesDePacks.push(c); }
      else { c.sinPack = true; sinPack.push(c); }
    }
    if (sinPack.length) avisos.push({ tipo: "sin_pack", alumnoId: al.id, texto: `${sinPack.length} ${sinPack.length === 1 ? "clase" : "clases"} sin pack` });

    // Estado de cada pack (calculado, nunca guardado)
    let abiertoAnterior = false;
    for (const e of est) {
      e.realizadas = e.previas + e.asignadas.length;
      e.restantes = Math.max(0, restante(e));
      if (e.anulado) e.estado = "anulado";
      else if (e.inicio > hoy || (abiertoAnterior && e.asignadas.length === 0)) e.estado = "pendiente";
      else if (e.restantes <= 0) e.estado = "terminado";
      else if (e.restantes <= umbral.urgente) e.estado = "urgente";
      else if (e.restantes <= umbral.renovacion) e.estado = "renovar";
      else e.estado = "activo";
      if (!e.anulado && e.restantes > 0 && e.estado !== "pendiente") abiertoAnterior = true;
    }
    const actual = vivos.find(e => ["activo", "renovar", "urgente"].includes(e.estado))
      || [...vivos].reverse().find(e => e.estado === "terminado") || vivos.find(e => e.estado === "pendiente") || null;
    const ultimo = vivos[vivos.length - 1];
    const pendienteRenovar = al.modoPago !== "por_clase" && !!ultimo && ultimo.estado === "terminado" && !ultimo.pack.noRenueva;

    // Contador de tarifa: acumulado de toda la historia del alumno (no se reinicia con los packs)
    const prev = al.clasesPreviasTarifa && Number.isInteger(al.clasesPreviasTarifa.clases) ? al.clasesPreviasTarifa : { clases: 0, hasta: null };
    let n = prev.clases;
    for (const c of lista) {
      if (!c.cuenta) continue;
      if (prev.hasta && c.fecha <= prev.hasta) { c.ordinalTarifa = null; continue; }
      c.ordinalTarifa = ++n;
    }

    porAlumno.set(al.id, { alumno: al, consumos: lista, packs: est, actual, pendienteRenovar, sueltas, sinPack, cubiertas, antesDePacks, totalTarifa: n });
  }

  return { eventos, consumos, porAlumno, sinVincular: [...sinVincular.values()], avisos, umbral };
}

/* ---------- tarifas y factura ---------- */
/** Tarifa vigente de una academia y tipo en una fecha. */
export function tarifaVigente(tarifas, academiaId, tipo, fecha, categoria){
  return tarifas.filter(t => t.academiaId === academiaId && t.tipo === tipo && (!categoria || t.categoria === categoria) && (!t.vigenteDesde || t.vigenteDesde <= fecha))
    .sort((a, b) => (a.vigenteDesde || "") < (b.vigenteDesde || "") ? 1 : -1)[0] || null;
}
function tramo(t, ordinal){
  return (t.tramos || []).find(x => ordinal >= x.desdeClase && (x.hastaClase == null || ordinal <= x.hastaClase)) || null;
}

/**
 * Factura de un mes («2026-11») para una academia.
 * Devuelve { lineas: [{ fecha, concepto, detalle, importe, eventId?, packId? }], total, avisos }
 */
export function factura(resultado, datos, academiaId, mes){
  const lineas = [], avisos = [];
  const enMes = f => f && f.slice(0, 7) === mes;
  const nombre = id => { const a = datos.alumnos.find(x => x.id === id); return a ? [a.nombre, a.apellidos].filter(Boolean).join(" ") : "?"; };
  const consumos = resultado.consumos.filter(c => c.academiaId === academiaId && enMes(c.fecha));

  if (academiaId === "spanish-with-irene") {
    const sesiones = new Map();
    for (const c of consumos) (sesiones.get(c.eventId) || sesiones.set(c.eventId, []).get(c.eventId)).push(c);
    for (const [eventId, cs] of sesiones) {
      const cuentan = cs.filter(c => c.cuenta);
      if (!cuentan.length) continue;
      const t = tarifaVigente(datos.tarifas, academiaId, "por_clase_escalonada", cs[0].fecha);
      if (!t) { avisos.push({ eventId, texto: "No hay tarifa vigente para esta fecha" }); continue; }
      if (cuentan.some(c => c.ordinalTarifa == null)) { avisos.push({ eventId, texto: "Clase anterior al contador inicial: no se puede saber su tramo" }); continue; }
      const mod = cuentan.length >= 2 ? "pareja" : "individual";
      if (cuentan.length > 2) avisos.push({ eventId, texto: "Clase con más de dos alumnos: se ha facturado como pareja" });
      const ord = Math.max(...cuentan.map(c => c.ordinalTarifa));     // en pareja basta con que uno haya pasado el tramo
      const tr = tramo(t, ord);
      if (!tr || tr[mod] == null) { avisos.push({ eventId, texto: "La tarifa no tiene precio para este caso" }); continue; }
      lineas.push({ eventId, fecha: cs[0].fecha, concepto: mod === "pareja" ? "Clase en pareja" : "Clase individual",
        detalle: cuentan.map(c => `${nombre(c.alumnoId)} (${c.ordinalTarifa}.ª)`).join(" y "), tramo: `${tr.desdeClase}${tr.hastaClase ? "–" + tr.hastaClase : "+"}`, importe: tr[mod] });
    }
  } else if (academiaId === "lsi-karmele") {
    for (const p of datos.packs || []) {
      if (p.estadoManual === "anulado" || p.fechaCompraDesconocida || !enMes(p.fechaCompra)) continue;   // un pack antiguo sin fecha ya se facturó
      const al = datos.alumnos.find(a => a.id === p.alumnoId);
      if (!al || al.academiaId !== academiaId) continue;
      const importe = p.precio && typeof p.precio.importe === "number" ? p.precio.importe : null;
      if (importe == null) { avisos.push({ packId: p.id, texto: `El pack de ${nombre(p.alumnoId)} no tiene precio` }); continue; }
      lineas.push({ packId: p.id, fecha: p.fechaCompra, concepto: p.nombre || "Pack", detalle: nombre(p.alumnoId), importe });
    }
    for (const c of consumos) {
      if (!c.cuenta || !c.suelta) continue;
      const t = tarifaVigente(datos.tarifas, academiaId, "por_clase_duracion", c.fecha);
      const precio = t && (t.precios || []).find(x => x.minutos === c.minutos);
      if (!precio) { avisos.push({ eventId: c.eventId, texto: `Clase suelta de ${c.minutos} min sin precio` }); continue; }
      lineas.push({ eventId: c.eventId, fecha: c.fecha, concepto: `Clase suelta ${c.minutos} min`, detalle: nombre(c.alumnoId), importe: precio.precio });
    }
  }
  lineas.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
  return { lineas, total: lineas.reduce((s, l) => s + l.importe, 0), avisos };
}
