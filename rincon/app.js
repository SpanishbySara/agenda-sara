// Mi rincón de profe · interfaz
export const VERSION = "2026-11-28e";
import { calcular, eventosValidos, academiaDeEvento, participantes, aliasId, esPasada, duracion, dayKey, mins, ESTADOS_CLASE } from "./calculo.js?v=2026-11-28e";

const DEMO = new URLSearchParams(location.search).has("demo");
let D = null;   // módulo de datos (Firebase); no se carga en modo demostración

/* ================= estado ================= */
const S = {
  sesion: DEMO ? "demo" : "cargando",   // cargando | fuera | dentro | demo
  agenda: null, agendaError: "",
  rincon: {}, rinconDenegado: false
};

/* ================= utilidades ================= */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MN = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DN = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const parse = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const fechaCorta = k => { const d = parse(k); return d.getDate() + " " + MN[d.getMonth()].slice(0, 3); };
const mesKey = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
const mesNombre = k => { const [y, m] = k.split("-").map(Number); return MN[m - 1] + " " + y; };
const sumarMes = (k, n) => { const [y, m] = k.split("-").map(Number); return mesKey(new Date(y, m - 1 + n, 1)); };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const horas = m => (Math.round(m / 6) / 10).toString().replace(".", ",") + " h";
const plural = (n, a, b) => n + " " + (n === 1 ? a : b);

/* ================= academias ================= */
const ACAD_BASE = [
  { id: "spanish-with-irene", nombre: "Spanish with Irene", corto: "Irene", css: "irene", patron: /\(\s*irene\s*\)/i, enMiEspacio: true, coordinada: true, packsHabituales: [24, 36] },
  { id: "lsi-karmele", nombre: "LSI Karmele", corto: "LSI", css: "lsi", patron: /\(\s*lsi\b[^)]*\)/i, enMiEspacio: true, coordinada: false, packsHabituales: [10] }
];
function tiposAgenda(){
  const s = (S.agenda || []).find(i => i.id === "settings-tipos");
  return s && Array.isArray(s.types) ? s.types : [];
}
/** Las academias guardadas en Mi rincón de profe o, si aún no hay, las detectadas por el nombre del tipo. */
function academias(){
  const guardadas = S.rincon.academias || [];
  return ACAD_BASE.map(base => {
    const g = guardadas.find(x => x.id === base.id);
    if (g) return { ...base, ...g, detectado: false };
    return { ...base, tiposAgenda: tiposAgenda().filter(t => base.patron.test(t.label || "")).map(t => t.id), detectado: true };
  });
}
const acad = id => academias().find(a => a.id === id) || { corto: "?", nombre: "?", css: "" };
const chip = id => { const a = acad(id); return `<span class="chip ${a.css}">${esc(a.corto)}</span>`; };

/* ================= cálculo ================= */
let cache = null;
function modelo(){
  if (cache) return cache;
  const ahora = new Date();
  const datos = {
    items: S.agenda || [], academias: academias(),
    alumnos: S.rincon.alumnos || [], packs: S.rincon.packs || [], ajustesPack: S.rincon.ajustesPack || [], tarifas: S.rincon.tarifas || [],
    config: (S.rincon.config || []).find(c => c.id === "general"),
    alias: new Map((S.rincon.alias || []).map(a => [a.id, a])),
    grupos: new Map((S.rincon.grupos || []).map(g => [g.id, g])),
    registros: new Map((S.rincon.registrosClase || []).map(r => [r.id, r]))
  };
  const r = calcular(datos, ahora);
  const ctx = { academias: datos.academias, alias: datos.alias, grupos: datos.grupos, registros: datos.registros };
  r.sesiones = r.eventos.map(ev => ({ ev, academiaId: academiaDeEvento(ev, datos.academias), pasada: esPasada(ev, ahora), p: participantes(ev, ctx) }))
    .sort((a, b) => a.ev.date < b.ev.date ? -1 : a.ev.date > b.ev.date ? 1 : mins(a.ev.start) - mins(b.ev.start));
  r.datos = datos;
  return (cache = r);
}
const invalidar = () => { cache = null; };

/* ================= iconos ================= */
const I = {
  home: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/><circle cx="17" cy="8" r="2.4"/><path d="M16 13.2c2.2.1 3.8 1.4 4.5 3.8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  layers: '<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
  hist: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4.5l3 2"/>',
  sprout: '<path d="M12 20v-8"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>',
  chart: '<path d="M4 20h16"/><path d="M7 16v-4M12 16V7M17 16v-6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  compass: '<circle cx="9" cy="12" r="4.5"/><circle cx="15" cy="12" r="4.5"/>',
  brief: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  eye: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  school: '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.5V16c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-4.5"/>',
  tag: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  steps: '<path d="M4 18h5v-4h5v-4h6"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  toggle: '<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
  sliders: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  out: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4"/>',
  left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

/* ================= navegación ================= */
function nav(){
  const m = modelo();
  return [
    { title: "General", items: [["inicio", "Dashboard", "home"], ["calendario", "Calendario", "cal"]] },
    { title: "Mi espacio de profe", space: "profe", items: [
      ["profe-resumen", "Resumen docente", "sun"], ["profe-alumnos", "Mis alumnos", "users"], ["profe-vincular", "Nombres sin vincular", "link", m.sinVincular.length],
      ["profe-packs", "Packs y renovaciones", "layers"], ["profe-historial", "Historial de clases", "hist"], ["profe-seguimiento", "Seguimiento académico", "sprout"],
      ["profe-actividad", "Mi actividad docente", "chart"], ["profe-factura", "Factura del mes", "receipt"]] },
    { title: "Jefa de estudios", space: "coord", items: [
      ["coord-resumen", "Resumen de coordinación", "sun"], ["coord-alumnado", "Alumnado", "users"], ["coord-matching", "Matching y agrupaciones", "compass"],
      ["coord-profesorado", "Profesorado", "brief"], ["coord-horarios", "Horarios y asignaciones", "clock"], ["coord-seguimiento", "Seguimiento académico", "eye"],
      ["coord-incidencias", "Incidencias", "flag"], ["coord-informes", "Informes", "file"]] },
    { title: "Configuración", items: [
      ["conf-academias", "Academias", "school"], ["conf-tipos", "Tipos de clase", "tag"], ["conf-niveles", "Niveles", "steps"],
      ["conf-modalidades", "Modalidades", "grid"], ["conf-estados", "Estados", "toggle"], ["conf-preferencias", "Preferencias", "sliders"]] }
  ];
}
function renderNav(cur){
  $("#nav").innerHTML = nav().map(g => `<div class="navgrp"${g.space ? ` data-space="${g.space}"` : ""}>
    <span class="eyebrow">${esc(g.title)}</span>
    ${g.items.map(([id, label, icon, badge]) => `<a class="nav" href="#${id}" style="--accent:var(${g.space === "coord" ? "--oliva" : "--burdeos"})"${id === cur ? ' aria-current="page"' : ""}>${ic(icon)}<span>${esc(label)}</span>${badge ? `<span class="badge">${badge}</span>` : ""}</a>`).join("")}
  </div>`).join("") + `<span class="version">Versión ${VERSION}</span>` + (S.sesion === "dentro" ? `<button class="nav" type="button" id="logout">${ic("out")}<span>Cerrar sesión</span></button>` : "");
  const lo = $("#logout");
  if (lo) lo.onclick = async () => { lo.disabled = true; await D.salir(); };
}

/* ================= filtro de academia ================= */
let acFilter = "todas";
try { acFilter = localStorage.getItem("rincon-ac") || "todas"; } catch (e) {}
const acSeg = () => `<div class="seg" role="group" aria-label="Filtrar por academia">
  ${[["todas", "Todas"], ["lsi-karmele", "LSI Karmele"], ["spanish-with-irene", "Spanish with Irene"]].map(([v, l]) => `<button type="button" data-ac="${v}" aria-pressed="${acFilter === v}">${l}</button>`).join("")}</div>`;
const pasaFiltro = academiaId => acFilter === "todas" || academiaId === acFilter;

/* ================= piezas comunes ================= */
const head = (eyebrow, title, intro, side = "", color = "") => `<div class="head"><div><span class="eyebrow"${color ? ` style="color:${color}"` : ""}>${esc(eyebrow)}</span><h1>${esc(title)}</h1>${intro ? `<p>${intro}</p>` : ""}</div>${side}</div>`;
const nombresSesion = s => {
  const al = new Map((S.rincon.alumnos || []).map(a => [a.id, a]));
  return [...s.p.alumnos.map(id => esc(al.get(id)?.nombre || "?")), ...s.p.sinVincular.map(n => `<span class="sv" title="Sin vincular">${esc(n)}</span>`)].join(", ");
};
function aviso(){
  const f = flashMsg ? `<div class="banner ok-b" role="status">${esc(flashMsg)}</div>` : "";
  return f + avisoBase();
}
function avisoBase(){
  if (S.sesion === "demo") return `<div class="banner demo-b"><b>Modo demostración.</b> Agenda inventada: no se conecta a Firebase ni a tu agenda real. Lo que guardes aquí se pierde al recargar.</div>`;
  if (S.agendaError) return `<div class="banner error-b"><b>No se pudo leer la agenda.</b> ${esc(S.agendaError)}</div>`;
  if (S.rinconDenegado) return `<div class="banner"><b>Solo lectura por ahora.</b> Mi rincón de profe ya lee tu agenda. Para guardar fichas y packs falta publicar las reglas nuevas en Firebase; te avisaré en el siguiente paso.</div>`;
  return "";
}

function chartMeses(){
  const m = modelo(), hoyMes = mesKey(new Date());
  const meses = Array.from({ length: 6 }, (_, i) => sumarMes(hoyMes, i - 5));
  const cuenta = (mes, ac) => m.sesiones.filter(s => s.pasada && s.academiaId === ac && s.ev.date.slice(0, 7) === mes).length;
  const lsi = meses.map(x => acFilter === "spanish-with-irene" ? 0 : cuenta(x, "lsi-karmele"));
  const ire = meses.map(x => acFilter === "lsi-karmele" ? 0 : cuenta(x, "spanish-with-irene"));
  const max = Math.max(10, ...meses.map((_, i) => lsi[i] + ire[i]));
  const paso = max <= 20 ? 5 : max <= 60 ? 20 : 50, top = Math.ceil(max / paso) * paso;
  const W = 560, H = 210, L = 34, B = 26, T = 18, bw = 46, step = (W - L - 10) / meses.length;
  const y = v => H - B - (v / top) * (H - B - T);
  let g = "";
  for (let v = 0; v <= top; v += paso) g += `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-soft)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  meses.forEach((mes, i) => {
    const x = L + step * i + (step - bw) / 2, l = lsi[i], r = ire[i];
    if (l) g += `<rect x="${x}" y="${y(l)}" width="${bw}" height="${y(0) - y(l)}" fill="var(--oliva)" rx="2"/>`;
    if (r) g += `<rect x="${x}" y="${y(l + r)}" width="${bw}" height="${y(l) - y(l + r)}" fill="var(--burdeos)" rx="2"/>`;
    g += `<text x="${x + bw / 2}" y="${y(l + r) - 6}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${l + r}</text>`;
    g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle"${i === 5 ? ' style="fill:var(--ink);font-weight:600"' : ""}>${MN[Number(mes.slice(5)) - 1].slice(0, 3)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Clases impartidas por mes en los últimos seis meses">${g}</svg>`;
}

/* ================= vistas ================= */
function vInicio(){
  const m = modelo(), hoy = dayKey(new Date()), mes = mesKey(new Date());
  const deHoy = m.sesiones.filter(s => s.ev.date === hoy);
  const delMes = m.sesiones.filter(s => s.pasada && s.ev.date.slice(0, 7) === mes);
  const fichas = (S.rincon.alumnos || []).length;
  const avisos = [];
  if (m.sinVincular.length) avisos.push({ cls: "info", t: `${plural(m.sinVincular.length, "nombre", "nombres")} de la agenda sin vincular`, s: "No descuentan de ningún pack hasta que los vincules a una ficha.", go: "profe-vincular" });
  for (const [id, st] of m.porAlumno) {
    const a = st.alumno;
    if (st.sinPack.length && a.modoPago !== "por_clase") avisos.push({ cls: "urgent", t: a.nombre, s: plural(st.sinPack.length, "clase dada sin pack", "clases dadas sin pack"), go: "profe-packs" });
    if (st.pendienteRenovar) avisos.push({ cls: "urgent", t: a.nombre, s: "Pack terminado. ¿Renueva?", go: "profe-packs" });
    else if (st.actual && ["urgente", "renovar"].includes(st.actual.estado)) avisos.push({ cls: st.actual.estado === "urgente" ? "urgent" : "", t: a.nombre, s: `${st.actual.restantes === 1 ? "Queda 1 clase" : "Quedan " + st.actual.restantes + " clases"} del ${st.actual.pack.nombre || "pack"}` });
    void id;
  }
  const motor = m.avisos.filter(a => ["recuperacion", "duplicado", "huerfano"].includes(a.tipo));
  if (motor.length) avisos.push({ cls: "", t: plural(motor.length, "aviso en el historial", "avisos en el historial"), s: [...new Set(motor.map(a => a.texto))].slice(0, 2).join(" · "), go: "profe-historial" });
  const tipos = academias();
  if (tipos.some(a => !a.tiposAgenda.length)) avisos.push({ cls: "urgent", t: "Falta un tipo de clase", s: `No encuentro en tu agenda el tipo de ${tipos.filter(a => !a.tiposAgenda.length).map(a => a.nombre).join(" ni de ")}.`, go: "conf-tipos" });
  const h = new Date().getHours(), d = new Date();
  return `${aviso()}
  ${head(`${cap(DN[d.getDay()])}, ${d.getDate()} de ${MN[d.getMonth()]} de ${d.getFullYear()}`, `${h < 13 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches"}, Sara`,
    `Hoy tienes ${plural(deHoy.length, "clase", "clases")} de LSI e Irene en la agenda${avisos.length ? ` y ${plural(avisos.length, "aviso", "avisos")} que conviene revisar` : ""}.`)}
  <div class="spaces">
    <div class="space profe">
      <div class="t"><div><span class="eyebrow">Mis alumnos · LSI e Irene</span><h2>Mi espacio de profe</h2></div></div>
      <div class="figs"><div><b>${delMes.length}</b><span>clases dadas en ${MN[d.getMonth()]}</span></div><div><b>${fichas}</b><span>fichas de alumnos</span></div><div><b>${m.sinVincular.length}</b><span>nombres sin vincular</span></div></div>
      <button class="go" type="button" data-go="profe-resumen">Entrar</button>
      <svg class="art" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="var(--burdeos)" stroke-width="1.4"><path d="M18 72c11-6 21-6 32 0 11-6 21-6 32 0V34c-11-6-21-6-32 0-11-6-21-6-32 0z"/><path d="M50 34v38M26 44h16M26 52h16M58 44h16M58 52h12"/></svg>
    </div>
    <div class="space coord">
      <div class="t"><div><span class="eyebrow">Spanish with Irene · toda la academia</span><h2>Jefa de estudios</h2></div></div>
      <div class="figs"><div><b>${(S.rincon.alumnos || []).filter(a => a.academiaId === "spanish-with-irene").length}</b><span>alumnos con ficha</span></div><div><b>${(S.rincon.profesores || []).length}</b><span>profesores</span></div><div><b>${(S.rincon.incidencias || []).filter(i => i.estado !== "resuelta").length}</b><span>incidencias abiertas</span></div></div>
      <button class="go" type="button" data-go="coord-resumen">Entrar</button>
      <svg class="art" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="var(--oliva)" stroke-width="1.4"><circle cx="38" cy="40" r="10"/><circle cx="64" cy="40" r="10"/><path d="M20 76c3-11 10-17 18-17s15 6 18 17M46 76c3-11 10-17 18-17s15 6 18 17"/></svg>
    </div>
  </div>
  <div class="cols">
    <section class="section"><header><h2>Necesita tu atención</h2><span class="muted" style="font-size:.8rem">${plural(avisos.length, "aviso", "avisos")}</span></header>
      ${avisos.length ? `<ul class="alerts">${avisos.map(a => `<li><span class="dot ${a.cls}"></span><div><b>${esc(a.t)}</b><small>${esc(a.s)}</small></div>${a.go ? `<button class="link" type="button" data-go="${a.go}">Revisar</button>` : "<span></span>"}</li>`).join("")}</ul>` : `<p class="empty">Todo en orden.</p>`}
    </section>
    <section class="section"><header><h2>Clases de hoy</h2><button class="link" type="button" data-go="profe-historial">Historial</button></header>
      ${deHoy.length ? `<ul class="today">${deHoy.map(s => `<li><time>${esc(s.ev.start)}</time><div><b>${esc(s.ev.title)}</b><small>${duracion(s.ev)} min · ${s.p.modalidad}</small></div>${chip(s.academiaId)}</li>`).join("")}</ul>` : `<p class="empty">Hoy no tienes clases de LSI ni de Irene.</p>`}
      <p class="note">Estas clases salen de tu agenda. Mi rincón de profe solo las lee.</p>
    </section>
  </div>`;
}

function vProfeResumen(){
  const m = modelo(), mes = mesKey(new Date());
  const ses = m.sesiones.filter(s => pasaFiltro(s.academiaId));
  const delMes = ses.filter(s => s.pasada && s.ev.date.slice(0, 7) === mes);
  const al = (S.rincon.alumnos || []).filter(a => pasaFiltro(a.academiaId));
  const st = [...m.porAlumno.values()].filter(x => pasaFiltro(x.alumno.academiaId));
  const porRenovar = st.filter(x => x.actual && ["urgente", "renovar"].includes(x.actual.estado));
  const terminados = st.filter(x => x.pendienteRenovar);
  const restantes = st.reduce((s, x) => s + x.packs.filter(p => ["activo", "renovar", "urgente", "pendiente"].includes(p.estado)).reduce((t, p) => t + p.restantes, 0), 0);
  const sv = m.sinVincular.filter(x => pasaFiltro(x.academiaId));
  return `${aviso()}
  ${head("Mi espacio de profe", "Resumen docente", "Solo tus clases de LSI Karmele y Spanish with Irene. Las clases particulares no aparecen aquí.", acSeg(), "var(--burdeos)")}
  <div class="ledger">
    <div><span class="v">${al.filter(a => a.estado === "activo").length}</span><span class="l">Alumnos activos</span></div>
    <div><span class="v">${al.filter(a => a.estado === "pausa").length}</span><span class="l">En pausa</span></div>
    <div><span class="v">${delMes.length}</span><span class="l">Clases dadas en ${MN[new Date().getMonth()]}</span></div>
    <div><span class="v">${horas(delMes.reduce((s, x) => s + duracion(x.ev), 0))}</span><span class="l">Horas de clase este mes</span></div>
    <div class="warn"><span class="v">${porRenovar.length}</span><span class="l">Packs a punto de terminar</span></div>
    <div class="urg"><span class="v">${terminados.length}</span><span class="l">Packs terminados</span></div>
    <div><span class="v">${restantes}</span><span class="l">Clases restantes en total</span></div>
  </div>
  <div class="cols">
    <section class="section chart"><header><h2>Clases impartidas por mes</h2><div class="legend">${acFilter !== "spanish-with-irene" ? '<span><i style="background:var(--oliva)"></i>LSI</span>' : ""}${acFilter !== "lsi-karmele" ? '<span><i style="background:var(--burdeos)"></i>Irene</span>' : ""}</div></header>${chartMeses()}</section>
    <section class="section"><header><h2>Próximas renovaciones</h2><button class="link" type="button" data-go="profe-packs">Ver packs</button></header>
      ${porRenovar.length + terminados.length ? `<ul class="alerts">${[...porRenovar, ...terminados].map(x => `<li><span class="dot ${x.actual && x.actual.estado === "renovar" ? "" : "urgent"}"></span><div><b>${esc(x.alumno.nombre)}</b><small>${x.pendienteRenovar ? "Terminado" : plural(x.actual.restantes, "clase restante", "clases restantes")}</small></div>${chip(x.alumno.academiaId)}</li>`).join("")}</ul>`
        : `<p class="empty">${al.length ? "Ningún pack está a punto de terminar." : `Cuando crees las fichas y sus packs, aquí verás quién tiene que renovar. Ahora mismo hay ${plural(sv.length, "nombre", "nombres")} de la agenda esperando ficha.`}</p>`}
    </section>
  </div>`;
}

let fAl = { q: "", nivel: "", estado: "", pago: "" };
function vProfeAlumnos(){
  const m = modelo();
  const todos = misAlumnos().filter(a => pasaFiltro(a.academiaId));
  const al = todos.filter(a => (!fAl.q || nombreCompleto(a).toLowerCase().includes(fAl.q.toLowerCase())) && (!fAl.nivel || a.nivelInicial === fAl.nivel)
    && (!fAl.estado || a.estado === fAl.estado) && (!fAl.pago || a.modoPago === fAl.pago))
    .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), "es"));
  const modalidad = st => { const ult = st && [...st.consumos].reverse().find(c => !c.prevista); return ult ? cap(ult.modalidad) : "—"; };
  const opt = (k, list) => list.map(([v, l]) => `<option value="${v}"${fAl[k] === v ? " selected" : ""}>${l}</option>`).join("");
  const boton = puedeEscribir() ? `<button class="btn primary" type="button" id="nuevoAl">+ Nuevo alumno</button>` : "";
  return `${aviso()}
  ${head("Mi espacio de profe", "Mis alumnos", "Pulsa un alumno para abrir su ficha. Las clases salen de tu agenda.", `<div class="headside">${acSeg()}${boton}</div>`, "var(--burdeos)")}
  ${todos.length ? `
  <div class="tools">
    <input id="fq" type="search" placeholder="Buscar por nombre" value="${esc(fAl.q)}" aria-label="Buscar alumno por nombre">
    <select id="fnivel" aria-label="Nivel">${opt("nivel", [["", "Todos los niveles"], ...NIVELES.map(n => [n, n])])}</select>
    <select id="festado" aria-label="Estado">${opt("estado", [["", "Todos los estados"], ["activo", "Activo"], ["pausa", "En pausa"], ["finalizado", "Finalizado"], ["temporal", "Temporal"]])}</select>
    <select id="fpago" aria-label="Forma de pago">${opt("pago", [["", "Pack y clase a clase"], ["pack", "Con pack"], ["por_clase", "Clase a clase"]])}</select>
  </div>
  <div class="twrap"><table><thead><tr><th>Alumno</th><th>Academia</th><th>Nivel</th><th>Modalidad</th><th>Profesora</th><th>Pack actual</th><th class="n">Realizadas</th><th class="n">Restantes</th><th>Estado</th></tr></thead>
    <tbody>${al.map(a => { const st = m.porAlumno.get(a.id), pk = st && st.actual, prev = (a.clasesPreviasTarifa && a.clasesPreviasTarifa.clases) || 0, dadas = (st ? st.consumos.filter(c => c.cuenta).length : 0) + prev;
      return `<tr data-ficha="${a.id}" tabindex="0"><td><span class="name${resaltado(a.id)}">${esc(nombreCompleto(a))}</span><small>${esc(aliasDe(a.id).map(z => "«" + z.texto + "»").join(", ") || "Sin nombre de agenda vinculado")}</small></td>
      <td>${chip(a.academiaId)}</td><td>${esc(a.nivelInicial || "—")}</td><td>${modalidad(st)}</td><td>Sara</td>
      <td>${a.modoPago === "por_clase" ? '<span class="muted">Clase a clase</span>' : pk ? esc(pk.pack.nombre || "Pack") : '<span class="muted">Sin pack</span>'}</td>
      <td class="n">${pk ? pk.realizadas : dadas}</td><td class="n">${pk ? pk.restantes : "—"}</td>
      <td><span class="state st-${a.estado === "activo" ? "activo" : "pausa"}">${esc(ESTADOS_ALUMNO[a.estado] || a.estado)}</span></td></tr>`; }).join("")}</tbody></table>
    ${al.length ? "" : `<p class="empty">Ningún alumno coincide con estos filtros.</p>`}</div>`
    : `<div class="emptybox"><h2>Todavía no hay fichas</h2><p>Tu agenda tiene ${plural(m.sinVincular.length, "nombre", "nombres")} de alumnos de LSI e Irene. Crea sus fichas desde <b>Nombres sin vincular</b>: el nombre, la academia y la fecha de la primera clase se rellenan solos.</p><button class="go" type="button" data-go="profe-vincular">Ver nombres de la agenda</button></div>`}`;
}

function vVincular(){
  const m = modelo();
  const lista = m.sinVincular.filter(x => pasaFiltro(x.academiaId)).map(x => {
    const evs = x.eventos.map(id => m.eventos.find(e => e.id === id)).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1);
    const hoy = dayKey(new Date());
    return { ...x, total: evs.length, dadas: evs.filter(e => e.date <= hoy).length, primera: evs[0]?.date, ultima: [...evs].reverse().find(e => e.date <= hoy)?.date, proxima: evs.find(e => e.date > hoy)?.date };
  }).sort((a, b) => (b.ultima || "") < (a.ultima || "") ? -1 : 1);
  return `${aviso()}
  ${head("Mi espacio de profe", "Nombres sin vincular", "Nombres que aparecen en los títulos de tus clases de LSI e Irene y que todavía no corresponden a ninguna ficha. Mientras estén aquí no descuentan de ningún pack.", acSeg(), "var(--burdeos)")}
  ${lista.length ? `<div class="twrap"><table><thead><tr><th>Nombre en la agenda</th><th>Academia</th><th class="n">Clases</th><th>Primera</th><th>Última</th><th>Próxima</th><th></th></tr></thead>
    <tbody>${lista.map(x => `<tr class="static"><td><span class="name">${esc(x.texto)}</span></td><td>${chip(x.academiaId)}</td><td class="n">${x.dadas}${x.total > x.dadas ? `<small>+${x.total - x.dadas} previstas</small>` : ""}</td>
      <td>${x.primera ? fechaCorta(x.primera) : "—"}</td><td>${x.ultima ? fechaCorta(x.ultima) : "—"}</td><td>${x.proxima ? fechaCorta(x.proxima) : "—"}</td>
      <td style="white-space:nowrap">${puedeEscribir() ? (sugerirNombres(x.texto).length >= 2
        ? `<button class="btn sm" type="button" data-separar="${esc(x.aliasId)}">Separar en ${sugerirNombres(x.texto).length} alumnos</button> <button class="btn sm ghost" type="button" data-crear="${esc(x.aliasId)}">Es una sola persona</button>`
        : `<button class="btn sm" type="button" data-crear="${esc(x.aliasId)}">Crear ficha</button> <button class="btn sm ghost" type="button" data-vincular="${esc(x.aliasId)}">Vincular</button>`) : `<span class="muted" style="font-size:.8rem">Falta publicar las reglas</span>`}</td></tr>`).join("")}</tbody></table></div>
    <p class="note"><b>Crear ficha</b> si es un alumno nuevo. <b>Vincular</b> si es otra forma de escribir a alguien que ya tiene ficha, por ejemplo «Ana G.» y «Ana García». <b>Separar</b> cuando el título lleva a dos personas, como «Alex- Joe»: cada una tiene su ficha individual.</p>`
    : `<p class="empty">Todos los nombres de la agenda están vinculados a una ficha.</p>`}`;
}

let mesHist = mesKey(new Date());
function vHistorial(){
  const m = modelo();
  const ses = m.sesiones.filter(s => s.ev.date.slice(0, 7) === mesHist && pasaFiltro(s.academiaId)).reverse();
  return `${aviso()}
  ${head("Mi espacio de profe", "Historial de clases", "Tus clases de LSI e Irene leídas de la agenda, de la más reciente a la más antigua.", acSeg(), "var(--burdeos)")}
  <div class="tools"><div class="monthnav"><button class="iconbtn" type="button" data-mes="-1" aria-label="Mes anterior">${ic("left")}</button><b>${cap(mesNombre(mesHist))}</b><button class="iconbtn" type="button" data-mes="1" aria-label="Mes siguiente">${ic("right")}</button></div>
    <span class="muted" style="font-size:.85rem">${plural(ses.filter(s => s.pasada).length, "clase dada", "clases dadas")}${ses.some(s => !s.pasada) ? ` · ${ses.filter(s => !s.pasada).length} previstas` : ""}</span></div>
  ${ses.length ? `<div class="twrap"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Academia</th><th>Alumnos</th><th>Modalidad</th><th class="n">Duración</th><th>Estado</th></tr></thead>
    <tbody>${ses.map(s => { const reg = m.datos.registros.get(s.ev.id);
      return `<tr data-clase="${esc(s.ev.id)}" tabindex="0"><td>${fechaCorta(s.ev.date)}</td><td class="num">${esc(s.ev.start)}–${esc(s.ev.end)}</td><td>${chip(s.academiaId)}</td><td>${nombresSesion(s)}${reg && reg.contenido ? `<small>${esc(reg.contenido)}</small>` : ""}</td>
      <td>${cap(s.p.modalidad)}</td><td class="n">${duracion(s.ev)} min</td><td>${estadoSesion(s)}</td></tr>`; }).join("")}</tbody></table></div>
    <p class="note">Pulsa una clase para marcar cancelaciones o recuperaciones y apuntar el contenido trabajado. Si no marcas nada, una clase pasada cuenta como impartida.</p>`
    : `<p class="empty">No hay clases de LSI ni de Irene en ${mesNombre(mesHist)}.</p>`}`;
}

function vCalendario(){
  const m = modelo(), hoy = dayKey(new Date());
  const prox = m.sesiones.filter(s => s.ev.date >= hoy).slice(0, 8);
  const ignorados = tiposAgenda().filter(t => !academias().some(a => a.tiposAgenda.includes(t.id)));
  return `${aviso()}
  ${head("General", "Calendario", "Tu agenda sigue siendo el único sitio donde apuntas las clases. Mi rincón de profe las lee en tiempo real y no crea un calendario nuevo.")}
  <div class="cols">
    <section class="section"><header><h2>Próximas clases</h2></header>
      ${prox.length ? `<ul class="today">${prox.map(s => `<li><time>${s.ev.date === hoy ? esc(s.ev.start) : fechaCorta(s.ev.date)}</time><div><b>${esc(s.ev.title)}</b><small>${s.ev.date === hoy ? "Hoy" : esc(s.ev.start)} · ${duracion(s.ev)} min</small></div>${chip(s.academiaId)}</li>`).join("")}</ul>` : `<p class="empty">No hay clases próximas de LSI ni de Irene.</p>`}</section>
    <section class="section"><header><h2>Qué se lee de la agenda</h2></header>
      <ul class="alerts">
        ${academias().map(a => `<li><span class="dot info"></span><div><b>${esc(a.tiposAgenda.map(id => tiposAgenda().find(t => t.id === id)?.label || id).join(", ") || "Sin tipo")}</b><small>${esc(a.nombre)} · fecha, hora, duración y título</small></div><span></span></li>`).join("")}
        <li><span class="dot"></span><div><b>${esc(ignorados.map(t => t.label).join(", ") || "Ningún otro tipo")}</b><small>Se ignoran por completo</small></div><span></span></li>
        <li><span class="dot coord"></span><div><b>Nada se escribe en la agenda</b><small>Asistencias y cancelaciones se guardarán aparte</small></div><span></span></li>
      </ul></section>
  </div>`;
}

function vTipos(){
  const ac = academias(), tipos = tiposAgenda(), m = modelo();
  const usoTipo = id => (S.agenda || []).filter(i => i.kind === "event" && i.type === id && !i.example).length;
  return `${aviso()}
  ${head("Configuración", "Tipos de clase", "Qué tipos de tu agenda corresponden a cada academia. Todos los demás se ignoran.")}
  <div class="twrap"><table><thead><tr><th>Tipo en tu agenda</th><th class="n">Clases</th><th>Se usa en Mi rincón de profe como</th></tr></thead>
    <tbody>${tipos.map(t => { const a = ac.find(x => x.tiposAgenda.includes(t.id));
      return `<tr class="static"><td><span class="swatch" style="background:${/^#[0-9a-f]{6}$/i.test(t.color || "") ? t.color : "#6b7392"}"></span>${esc(t.label)}</td><td class="n">${usoTipo(t.id)}</td><td>${a ? chip(a.id) + " " + esc(a.nombre) : '<span class="muted">Se ignora</span>'}</td></tr>`; }).join("")}</tbody></table></div>
  ${ac.some(a => a.detectado) ? `<p class="note">${ac.every(a => a.tiposAgenda.length) ? "Detectado automáticamente por el nombre del tipo. Al confirmarlo queda guardado por su identificador, así que renombrar el tipo en la agenda no romperá nada. También se guardan las tarifas y los avisos de 3 y 1 clases." : "No encuentro alguno de los tipos. Revisa que en tu agenda se llamen «Clases (LSI)» y «Clases (Irene)»."}</p>
    ${puedeEscribir() && ac.every(a => a.tiposAgenda.length) ? `<button class="btn primary" type="button" id="confirmarTipos" style="align-self:flex-start">Confirmar y guardar la configuración</button>` : ""}`
    : `<p class="note">Configuración guardada. Renombrar estos tipos en la agenda no rompe nada; borrarlos sí, porque la agenda pasaría sus clases a otro tipo.</p>`}
  <p class="muted" style="font-size:.85rem">${plural(m.eventos.length, "clase", "clases")} de LSI e Irene leídas de la agenda en total.</p>`;
}

function vAcademias(){
  return `${aviso()}
  ${head("Configuración", "Academias", "Lo que acordamos en la arquitectura. Las tarifas se guardarán en el siguiente paso.")}
  <div class="acad">
    <article><h2 style="color:var(--burdeos)">Spanish with Irene</h2>
      <dl><dt>Tipo en la agenda</dt><dd>Clases (Irene)</dd><dt>Espacios</dt><dd>Mi espacio de profe y Jefa de estudios</dd><dt>Packs habituales</dt><dd>24 y 36 clases</dd><dt>Facturación</dt><dd>A principio de mes, por clase dada</dd></dl>
      <table class="rate"><thead><tr><th>Lo que cobro</th><th class="n">Clases 1–12</th><th class="n">Desde la 13</th></tr></thead>
        <tbody><tr><td>Individual</td><td class="n">17 €</td><td class="n">19 €</td></tr><tr><td>Pareja (clase entera)</td><td class="n">21 €</td><td class="n">23 €</td></tr></tbody></table>
      <p class="muted" style="font-size:.82rem">El contador de tarifa es acumulado por alumno. En pareja, si uno ya pasó de 12, se cobran 23 €.</p></article>
    <article class="lsi"><h2 style="color:var(--oliva)">LSI Karmele</h2>
      <dl><dt>Tipo en la agenda</dt><dd>Clases (LSI)</dd><dt>Espacios</dt><dd>Mi espacio de profe</dd><dt>Packs habituales</dt><dd>10 clases</dd><dt>Facturación</dt><dd>A principio de mes</dd></dl>
      <table class="rate"><thead><tr><th>Lo que cobro</th><th class="n">Importe</th><th>Cuándo</th></tr></thead>
        <tbody><tr><td>Pack adultos (10)</td><td class="n">180 €</td><td>Mes de compra</td></tr><tr><td>Pack apoyo (10)</td><td class="n">190 €</td><td>Mes de compra</td></tr><tr><td>Clase suelta 60 min</td><td class="n">19 €</td><td>Mes de la clase</td></tr><tr><td>Clase suelta 45 min</td><td class="n">15 €</td><td>Mes de la clase</td></tr></tbody></table></article>
  </div>`;
}

function vPacks(){
  const m = modelo(), mios = new Set(misAlumnos().map(a => a.id));
  const st = [...m.porAlumno.values()].filter(x => mios.has(x.alumno.id) && pasaFiltro(x.alumno.academiaId) && x.alumno.estado !== "finalizado");
  const conPack = st.filter(x => x.alumno.modoPago !== "por_clase");
  const atencion = conPack.filter(x => x.pendienteRenovar || (x.actual && ["renovar", "urgente"].includes(x.actual.estado)))
    .sort((a, b) => (a.pendienteRenovar ? 0 : a.actual.restantes) - (b.pendienteRenovar ? 0 : b.actual.restantes));
  const enCurso = conPack.filter(x => !atencion.includes(x) && x.actual && x.actual.estado === "activo").sort((a, b) => a.actual.restantes - b.actual.restantes);
  const pendientes = conPack.flatMap(x => x.packs.filter(e => e.estado === "pendiente").map(e => ({ x, e })));
  const sinPack = conPack.filter(x => !x.packs.some(e => !e.anulado) || x.sinPack.length);
  const fila = (x, e) => `<button class="packrow" type="button" data-fichapk="${x.alumno.id}">
      <span><b class="name${resaltado(x.alumno.id)}">${esc(nombreCompleto(x.alumno))}</b><br><small class="muted">${esc(e.pack.nombre || "Pack")} · ${chip(x.alumno.academiaId)}</small></span>
      ${ticksPack(e, x.alumno.academiaId)}
      <span class="when muted" style="font-size:.8rem">Compra<br>${e.pack.fechaCompraDesconocida ? "—" : fechaCorta(e.pack.fechaCompra)}</span>
      <span class="rest"${e.estado === "renovar" ? ' style="color:var(--terracota)"' : ["urgente", "terminado"].includes(e.estado) ? ' style="color:var(--urgent)"' : ""}>${e.restantes}<small>${e.estado === "terminado" ? "terminado" : e.estado === "pendiente" ? "sin empezar" : e.restantes === 1 ? "clase restante" : "restantes"}</small></span></button>`;
  const grupo = (t, html, n, vacio) => `<section class="section"><header><h2>${t}</h2><span class="muted" style="font-size:.8rem">${n}</span></header>${n ? `<div class="packrows">${html}</div>` : `<p class="empty">${vacio}</p>`}</section>`;
  const u = (m.datos.config && m.datos.config.umbrales) || m.umbral;
  return `${aviso()}
  ${head("Mi espacio de profe", "Packs y renovaciones", `Cada marca es una clase. Aviso de renovación con ${u.renovacion} clases restantes y urgente con ${u.urgente}; se cambia en <a href="#conf-preferencias">Preferencias</a>.`, acSeg(), "var(--burdeos)")}
  ${grupo("Necesitan atención", atencion.map(x => fila(x, x.pendienteRenovar ? x.packs.filter(e => !e.anulado).slice(-1)[0] : x.actual)).join(""), atencion.length, "Ningún pack está a punto de terminar.")}
  ${grupo("En curso", enCurso.map(x => fila(x, x.actual)).join(""), enCurso.length, conPack.length ? "No hay packs en curso." : "Todavía no hay packs. Créalos desde la ficha de cada alumno, en la pestaña Packs.")}
  ${pendientes.length ? grupo("Renovaciones pendientes de empezar", pendientes.map(({ x, e }) => fila(x, e)).join(""), pendientes.length, "") : ""}
  ${sinPack.length ? `<section class="section"><header><h2>Sin pack</h2><span class="muted" style="font-size:.8rem">${sinPack.length}</span></header><ul class="alerts">${sinPack.map(x => `<li><span class="dot urgent"></span><div><b>${esc(nombreCompleto(x.alumno))}</b><small>${x.sinPack.length ? plural(x.sinPack.length, "clase dada sin pack", "clases dadas sin pack") : "Paga con pack pero no tiene ninguno"}</small></div><button class="link" type="button" data-fichapk="${x.alumno.id}">Crear pack</button></li>`).join("")}</ul></section>` : ""}`;
}

function vPreferencias(){
  const cfg = (S.rincon.config || []).find(c => c.id === "general"), u = Object.assign({ renovacion: 3, urgente: 1 }, cfg && cfg.umbrales);
  return `${aviso()}
  ${head("Configuración", "Preferencias", "Cuándo avisar de que un pack se termina.")}
  <form id="prefs" class="fgrid" style="max-width:520px" novalidate>
    <label class="field">Aviso de renovación con<input id="u_ren" type="number" min="1" step="1" value="${u.renovacion}"><span class="muted">clases restantes o menos</span></label>
    <label class="field">Aviso urgente con<input id="u_urg" type="number" min="0" step="1" value="${u.urgente}"><span class="muted">clases restantes o menos</span></label>
    <label class="field">Nombre en amarillo con<input id="u_ama" type="number" min="1" step="1" value="${coloresAviso().amarillo}"><span class="muted">clases restantes o menos · <span class="name resaltar amarillo">Así</span></span></label>
    <label class="field">Nombre en rojo con<input id="u_rojo" type="number" min="0" step="1" value="${coloresAviso().rojo}"><span class="muted">clases restantes o menos · <span class="name resaltar rojo">Así</span></span></label>
    <p class="err full" id="f_err" hidden></p>
    ${puedeEscribir() ? `<div class="full"><button class="btn primary" type="submit">Guardar</button></div>` : ""}
  </form>
  <p class="note">Con 0 clases restantes el pack se da por terminado y el alumno queda pendiente de renovar hasta que renueve o marques «No renueva».</p>`;
}

const PEND = {
  "profe-seguimiento": ["Mi espacio de profe", "Seguimiento académico", "Nivel, evaluaciones, destrezas, objetivos y próxima revisión de cada alumno."],
  "profe-actividad": ["Mi espacio de profe", "Mi actividad docente", "Clases, horas, alumnos atendidos, packs terminados y renovaciones por mes."],
  "profe-factura": ["Mi espacio de profe", "Factura del mes", "Lo que facturas a Irene y a LSI cada mes, calculado desde la agenda, con exportación a CSV."],
  "coord-resumen": ["Jefa de estudios", "Resumen de coordinación", "Cifras de la academia, alertas y carga del profesorado."],
  "coord-alumnado": ["Jefa de estudios", "Alumnado", "Todo el alumnado de Spanish with Irene, también el de otros profesores."],
  "coord-matching": ["Jefa de estudios", "Matching y agrupaciones", "Propuestas de parejas y grupos que solo se crean si las apruebas."],
  "coord-profesorado": ["Jefa de estudios", "Profesorado", "Ficha de cada profesor y su carga de trabajo."],
  "coord-horarios": ["Jefa de estudios", "Horarios y asignaciones", "Horarios, huecos libres e incompatibilidades."],
  "coord-seguimiento": ["Jefa de estudios", "Seguimiento académico", "Evolución del alumnado y quién necesita seguimiento."],
  "coord-incidencias": ["Jefa de estudios", "Incidencias", "Registro de incidencias con prioridad, estado y solución."],
  "coord-informes": ["Jefa de estudios", "Informes", "Informes de coordinación exportables."],
  "conf-niveles": ["Configuración", "Niveles", "A1, A2 y B1."],
  "conf-modalidades": ["Configuración", "Modalidades", "Individual, pareja (en la agenda, «Workshop») y grupo."],
  "conf-estados": ["Configuración", "Estados", "Estados de alumnos, packs y clases."]
};
function vPend(id){
  const [eyebrow, title, intro] = PEND[id];
  const col = eyebrow === "Jefa de estudios" ? "var(--oliva)" : eyebrow === "Mi espacio de profe" ? "var(--burdeos)" : "";
  return `${aviso()}${head(eyebrow, title, esc(intro), `<span class="phase">${eyebrow === "Jefa de estudios" ? "Fase 5" : "Próximos pasos de la fase 4"}</span>`, col)}`;
}

/* ================= escritura: fichas, alias y configuración ================= */
const NIVELES = ["A1", "A2", "B1"];
const ESTADOS_ALUMNO = { activo: "Activo", pausa: "En pausa", finalizado: "Finalizado", propuesta: "Propuesta", temporal: "Temporal", pendiente: "Pendiente de asignación" };
const YO = "pr_sara";
const puedeEscribir = () => S.sesion === "demo" || (S.sesion === "dentro" && !S.rinconDenegado && "alumnos" in S.rincon);
const configurado = () => (S.rincon.academias || []).length > 0;

/** Lo que se guarda la primera vez: academias, tarifas, ajustes generales y tu ficha de profesora. */
function baseInicial(){
  if (configurado()) return [];
  const ac = academias();
  const out = ac.map(a => ({ coleccion: "academias", id: a.id, nuevo: true, datos: {
    nombre: a.nombre, nombreCorto: a.corto, tiposAgenda: a.tiposAgenda, enMiEspacio: a.enMiEspacio, coordinada: a.coordinada, packsHabituales: a.packsHabituales, activa: true } }));
  const IRE = "spanish-with-irene", LSI = "lsi-karmele", desde = "2026-01-01";
  out.push(
    { coleccion: "tarifas", id: "irene-2026", nuevo: true, datos: { academiaId: IRE, nombre: "Clases Spanish with Irene", concepto: "honorarios_profesora", tipo: "por_clase_escalonada",
      contador: "acumulado_alumno", reglaPareja: "si_alguno_supera_tramo", moneda: "EUR", vigenteDesde: desde,
      tramos: [{ desdeClase: 1, hastaClase: 12, individual: 17, pareja: 21 }, { desdeClase: 13, hastaClase: null, individual: 19, pareja: 23 }] } },
    { coleccion: "tarifas", id: "lsi-adultos-2026", nuevo: true, datos: { academiaId: LSI, nombre: "Pack adultos", categoria: "adultos", tipo: "pack", clases: 10, precio: 180, moneda: "EUR", vigenteDesde: desde } },
    { coleccion: "tarifas", id: "lsi-apoyo-2026", nuevo: true, datos: { academiaId: LSI, nombre: "Pack apoyo", categoria: "apoyo", tipo: "pack", clases: 10, precio: 190, moneda: "EUR", vigenteDesde: desde } },
    { coleccion: "tarifas", id: "lsi-suelta-2026", nuevo: true, datos: { academiaId: LSI, nombre: "Clase suelta", tipo: "por_clase_duracion", precios: [{ minutos: 45, precio: 15 }, { minutos: 60, precio: 19 }], moneda: "EUR", vigenteDesde: desde } },
    { coleccion: "config", id: "general", nuevo: true, datos: { umbrales: { renovacion: 3, urgente: 1 }, niveles: NIVELES, nivelesDestrezas: NIVELES,
      destrezas: ["CL", "CA", "EE", "EO", "IO"], modalidades: ["individual", "pareja", "grupo"] } }
  );
  if (!(S.rincon.profesores || []).some(p => p.id === YO))
    out.push({ coleccion: "profesores", id: YO, nuevo: true, datos: { nombre: "Sara", esYo: true, academias: [IRE, LSI], niveles: NIVELES, modalidades: ["individual", "pareja", "grupo"], activo: true } });
  return out;
}

async function guardar(cambios, motivo, ok){
  try { await D.guardar(cambios, motivo); cerrarModal(); if (ok) flash(ok); }
  catch (e) {
    const err = document.querySelector("#f_err");
    const msg = D.esPermisoDenegado && D.esPermisoDenegado(e) ? "No hay permiso para guardar. ¿Están publicadas las reglas nuevas en Firebase?" : "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
    if (err) { err.textContent = msg; err.hidden = false; } else flash(msg);
  }
}

let flashMsg = "";
function flash(msg){ flashMsg = msg; render(); setTimeout(() => { if (flashMsg === msg) { flashMsg = ""; render(); } }, 4000); }

function modal(html){
  $("#modalRoot").innerHTML = `<div class="scrim" id="mscrim"></div><div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  $("#mscrim").onclick = cerrarModal;
  const m = $("#modalRoot .modal");
  m.querySelectorAll("[data-cerrar]").forEach(b => b.onclick = cerrarModal);
  const f = m.querySelector("input, select"); if (f) setTimeout(() => f.focus(), 0);
  return m;
}
function cerrarModal(){ $("#modalRoot").innerHTML = ""; }

const misAcademias = () => academias().filter(a => a.enMiEspacio);
const aliasDe = alumnoId => (S.rincon.alias || []).filter(a => a.alumnoId === alumnoId || (a.alumnoIds || []).includes(alumnoId));
const nombreCompleto = a => [a.nombre, a.apellidos].filter(Boolean).join(" ");
const misAlumnos = () => {
  const mios = new Set((S.rincon.asignaciones || []).filter(x => x.profesorId === YO && x.destino && x.destino.tipo === "alumno").map(x => x.destino.id));
  const enMi = new Set(misAcademias().map(a => a.id));
  return (S.rincon.alumnos || []).filter(a => enMi.has(a.academiaId) && mios.has(a.id));
};

/** Formulario de ficha. preset: { nombre, academiaId, aliasTexto, modalidad, desde } para crearla desde un nombre de la agenda. */
function formFicha(alumno, preset = {}){
  const nuevo = !alumno;
  const v = Object.assign({ nombre: "", apellidos: "", academiaId: misAcademias()[0].id, nivelInicial: "", estado: "activo", modoPago: "pack",
    nacionalidad: "", lenguaMaterna: "", clasesPreviasTarifa: null }, alumno || {}, nuevo ? preset : {});
  if (nuevo && preset.academiaId === "spanish-with-irene") v.modoPago = "pack";
  const prev = v.clasesPreviasTarifa || {};
  const m = modal(`
    <h2>${nuevo ? "Nueva ficha" : "Editar ficha"}</h2>
    ${preset.aliasTexto ? `<p class="muted">Se vinculará con «<b>${esc(preset.aliasTexto)}</b>» de la agenda: sus clases empezarán a contar en cuanto guardes.</p>` : ""}
    <form id="ff" class="fgrid" autocomplete="off" novalidate>
      <label class="field">Nombre<input id="f_nombre" value="${esc(v.nombre)}" maxlength="60" required></label>
      <label class="field">Apellidos<input id="f_apellidos" value="${esc(v.apellidos)}" maxlength="80"></label>
      <label class="field">Academia<select id="f_ac"${preset.academiaId || !nuevo ? " disabled" : ""}>${misAcademias().map(a => `<option value="${a.id}"${a.id === v.academiaId ? " selected" : ""}>${esc(a.nombre)}</option>`).join("")}</select></label>
      <label class="field">Nivel inicial<select id="f_nivel"><option value="">Sin nivel</option>${NIVELES.map(n => `<option${n === v.nivelInicial ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="field">Forma de pago<select id="f_pago"><option value="pack"${v.modoPago === "pack" ? " selected" : ""}>Con pack</option><option value="por_clase"${v.modoPago === "por_clase" ? " selected" : ""}>Clase a clase</option></select></label>
      <label class="field">Estado<select id="f_estado">${Object.entries(ESTADOS_ALUMNO).filter(([k]) => ["activo", "pausa", "finalizado", "temporal"].includes(k)).map(([k, l]) => `<option value="${k}"${k === v.estado ? " selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="field">Nacionalidad<input id="f_nac" value="${esc(v.nacionalidad)}" maxlength="40"></label>
      <label class="field">Lengua materna<input id="f_lengua" value="${esc(v.lenguaMaterna)}" maxlength="40"></label>
      <label class="field full" id="f_prev_box">Clases anteriormente dadas <span class="muted">Las que hizo contigo antes de apuntarlas en la agenda. Sirve para saber si cobras 17 € o 19 €. Si es nuevo, déjalo vacío.</span>
        <input id="f_prev_n" type="number" min="0" step="1" value="${prev.clases ?? ""}" placeholder="0" style="max-width:140px"></label>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full">${nuevo ? "" : `<span class="mfoot-izq"><button type="button" class="link" id="e_fusion">Fusionar con otra ficha</button><button type="button" class="link danger-l" id="e_borrar">Eliminar ficha</button></span>`}<button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
    </form>`);
  if (!nuevo) { m.querySelector("#e_fusion").onclick = () => formFusionar(alumno); m.querySelector("#e_borrar").onclick = () => eliminarFicha(alumno); }
  const acSel = m.querySelector("#f_ac"), box = m.querySelector("#f_prev_box");
  const upd = () => { box.hidden = acSel.value !== "spanish-with-irene"; };
  acSel.onchange = upd; upd();
  m.querySelector("#ff").onsubmit = ev => {
    ev.preventDefault();
    const err = m.querySelector("#f_err"), fail = t => { err.textContent = t; err.hidden = false; };
    const d = {
      nombre: m.querySelector("#f_nombre").value.trim(), apellidos: m.querySelector("#f_apellidos").value.trim(),
      academiaId: acSel.value, nivelInicial: m.querySelector("#f_nivel").value, modoPago: m.querySelector("#f_pago").value,
      estado: m.querySelector("#f_estado").value,
      nacionalidad: m.querySelector("#f_nac").value.trim(), lenguaMaterna: m.querySelector("#f_lengua").value.trim()
    };
    if (!d.nombre) return fail("Escribe el nombre del alumno.");
    const pn = m.querySelector("#f_prev_n").value.trim();
    if (d.academiaId === "spanish-with-irene" && pn) {
      const n = Number(pn);
      if (!Number.isInteger(n) || n < 0) return fail("Las clases anteriores tienen que ser un número entero, por ejemplo 20.");
      // Se suman antes de la primera clase del alumno en la agenda: sin fecha que rellenar.
      d.clasesPreviasTarifa = n > 0 ? { clases: n } : null;
    } else d.clasesPreviasTarifa = null;
    if (nuevo) {
      const id = D.nuevoId("alumnos", "al");
      const cambios = [...baseInicial(), { coleccion: "alumnos", id, nuevo: true, datos: { ...d, creadoEn: Date.now() } },
        { coleccion: "asignaciones", id: D.nuevoId("asignaciones", "as"), nuevo: true, datos: { destino: { tipo: "alumno", id }, profesorId: YO,
          modalidad: preset.modalidad || "individual", estado: "confirmada", desde: preset.fechaIncorporacion || dayKey(new Date()), hasta: null } }];
      if (preset.aliasTexto) cambios.push({ coleccion: "alias", id: aliasId(d.academiaId, preset.aliasTexto), nuevo: true,
        datos: { academiaId: d.academiaId, texto: preset.aliasTexto, tipo: "alumno", alumnoId: id } });
      guardar(cambios, "Nueva ficha", `Ficha de ${d.nombre} creada.`);
    } else {
      const { id, actualizadoEn, ...antes } = alumno; void actualizadoEn;
      guardar([{ coleccion: "alumnos", id, datos: { ...antes, ...d, academiaId: alumno.academiaId } }], "Editar ficha", "Ficha guardada.");
    }
  };
}

/** Vincular un nombre de la agenda a una ficha existente de la misma academia. */
function formVincular(x){
  const fichas = (S.rincon.alumnos || []).filter(a => a.academiaId === x.academiaId).sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), "es"));
  if (!fichas.length) { flash(`Todavía no hay fichas de ${acad(x.academiaId).nombre}. Crea primero una ficha.`); return; }
  const m = modal(`
    <h2>Vincular «${esc(x.texto)}»</h2>
    <p class="muted">Elige la ficha de ${esc(acad(x.academiaId).nombre)} a la que corresponde este nombre. Sus ${plural(x.eventos.length, "clase", "clases")} contarán para ese alumno.</p>
    <form id="fv" class="fgrid" novalidate>
      <label class="field full">Ficha<select id="v_al">${fichas.map(a => `<option value="${a.id}">${esc(nombreCompleto(a))}${aliasDe(a.id).length ? ` (en la agenda: ${esc(aliasDe(a.id).map(z => z.texto).join(", "))})` : ""}</option>`).join("")}</select></label>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Vincular</button></div>
    </form>`);
  m.querySelector("#fv").onsubmit = ev => {
    ev.preventDefault();
    const alumnoId = m.querySelector("#v_al").value, a = fichas.find(f => f.id === alumnoId);
    guardar([{ coleccion: "alias", id: aliasId(x.academiaId, x.texto), nuevo: true, datos: { academiaId: x.academiaId, texto: x.texto, tipo: "alumno", alumnoId } }],
      "Vincular nombre", `«${x.texto}» vinculado a ${nombreCompleto(a)}.`);
  };
}

/** «Alex- Joe», «Alex y Joe», «Alex, Joe»… → ["Alex", "Joe"]. Solo sugiere; la agenda no se toca. */
function sugerirNombres(texto){
  return String(texto).split(/\s*(?:[-–—,;\/+&·]|\s+y\s+|\s+e\s+)\s*/i).map(s => s.trim()).filter(s => s.length > 1);
}

/** Un nombre de la agenda con varias personas: una ficha individual para cada una. */
function formSeparar(x){
  const partes = sugerirNombres(x.texto);
  const fichas = (S.rincon.alumnos || []).filter(a => a.academiaId === x.academiaId).sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), "es"));
  const parecida = n => fichas.find(a => a.nombre.toLowerCase() === n.toLowerCase() || aliasDe(a.id).some(z => z.texto.toLowerCase() === n.toLowerCase()));
  const evs = x.eventos.map(id => modelo().eventos.find(e => e.id === id)).filter(Boolean).sort((a, b) => a.date < b.date ? -1 : 1);
  const m = modal(`
    <h2>Separar «${esc(x.texto)}»</h2>
    <p class="muted">Cada persona tendrá su propia ficha. En cada clase «${esc(x.texto)}» se descontará una clase del pack de cada uno y contará como clase en pareja.</p>
    <form id="fs" class="fgrid" novalidate>
      ${partes.map((p, i) => { const sug = parecida(p); return `<fieldset class="field full persona"><legend>Persona ${i + 1}</legend>
        <div class="row2"><label class="field">Ficha<select data-modo="${i}"><option value="nueva"${sug ? "" : " selected"}>Crear ficha nueva</option>${fichas.map(a => `<option value="${a.id}"${sug && sug.id === a.id ? " selected" : ""}>${esc(nombreCompleto(a))}</option>`).join("")}</select></label>
        <label class="field" data-nombre-box="${i}">Nombre<input data-nombre="${i}" value="${esc(p)}" maxlength="60"></label></div></fieldset>`; }).join("")}
      <label class="field">Nivel inicial (fichas nuevas)<select id="s_nivel"><option value="">Sin nivel</option>${NIVELES.map(n => `<option>${n}</option>`).join("")}</select></label>
      <label class="field">Forma de pago (fichas nuevas)<select id="s_pago"><option value="pack">Con pack</option><option value="por_clase">Clase a clase</option></select></label>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
    </form>`);
  const sync = () => m.querySelectorAll("[data-modo]").forEach(s => { m.querySelector(`[data-nombre-box="${s.dataset.modo}"]`).hidden = s.value !== "nueva"; });
  m.querySelectorAll("[data-modo]").forEach(s => s.onchange = sync); sync();
  m.querySelector("#fs").onsubmit = ev => {
    ev.preventDefault();
    const err = m.querySelector("#f_err"), fail = t => { err.textContent = t; err.hidden = false; };
    const cambios = [...baseInicial()], ids = [], nuevos = [];
    for (const s of m.querySelectorAll("[data-modo]")) {
      if (s.value !== "nueva") { ids.push(s.value); continue; }
      const nombre = m.querySelector(`[data-nombre="${s.dataset.modo}"]`).value.trim();
      if (!nombre) return fail("Escribe el nombre de cada persona nueva.");
      const id = D.nuevoId("alumnos", "al"), desde = evs[0] ? evs[0].date : dayKey(new Date());
      ids.push(id); nuevos.push(nombre);
      cambios.push({ coleccion: "alumnos", id, nuevo: true, datos: { nombre, apellidos: "", academiaId: x.academiaId, nivelInicial: m.querySelector("#s_nivel").value,
        modoPago: m.querySelector("#s_pago").value, estado: "activo", nacionalidad: "", lenguaMaterna: "", clasesPreviasTarifa: null, creadoEn: Date.now() } });
      cambios.push({ coleccion: "asignaciones", id: D.nuevoId("asignaciones", "as"), nuevo: true, datos: { destino: { tipo: "alumno", id }, profesorId: YO,
        modalidad: "pareja", estado: "confirmada", desde, hasta: null } });
    }
    if (new Set(ids).size !== ids.length) return fail("Has elegido la misma ficha dos veces.");
    cambios.push({ coleccion: "alias", id: aliasId(x.academiaId, x.texto), nuevo: true, datos: { academiaId: x.academiaId, texto: x.texto, tipo: "varios", alumnoIds: ids } });
    guardar(cambios, "Separar nombre de pareja", `«${x.texto}» separado en ${ids.length} fichas individuales${nuevos.length ? " (nuevas: " + nuevos.join(", ") + ")" : ""}.`);
  };
}

function quitarAlias(al){
  guardar([{ coleccion: "alias", id: al.id, datos: null }], "Desvincular nombre", `«${al.texto}» vuelve a Nombres sin vincular.`);
}

/* ================= estados de cada clase ================= */
const ETIQUETA = { impartida: "Impartida", cancelada_cuenta: "Cancelada (cuenta)", cancelada: "Cancelada", recuperacion: "Recuperación" };
const CSS_ESTADO = { impartida: "st-activo", cancelada_cuenta: "st-propuesta", cancelada: "st-pausa", recuperacion: "st-activo" };
/** Etiqueta del estado de un alumno en una clase (consumo del motor). */
function etiquetaConsumo(c){
  if (c.prevista) return c.estado !== "impartida" ? `<span class="state st-pausa">Prevista · ${ETIQUETA[c.estado]}</span>` : '<span class="state st-pausa">Prevista</span>';
  if (c.estado === "recuperacion" && !c.cuenta) return `<span class="state st-pausa" title="No descuenta: la clase original ya contaba">Recuperación (no cuenta)</span>`;
  return `<span class="state ${CSS_ESTADO[c.estado]}">${ETIQUETA[c.estado]}</span>`;
}
function estadoSesion(s){
  const m = modelo(), al = new Map((S.rincon.alumnos || []).map(a => [a.id, a]));
  const cs = m.consumos.filter(c => c.eventId === s.ev.id);
  if (!cs.length) return s.pasada ? '<span class="state st-activo">Impartida</span>' : '<span class="state st-pausa">Prevista</span>';
  if (cs.every(c => c.estado === "impartida")) return etiquetaConsumo(cs[0]);
  return cs.map(c => `<span class="estado-al">${cs.length > 1 ? esc(al.get(c.alumnoId)?.nombre || "?") + ": " : ""}${etiquetaConsumo(c)}</span>`).join("");
}

/** Marcar estados, recuperación, contenido y observaciones de una clase. */
function formClase(eventId){
  const m = modelo(), s = m.sesiones.find(x => x.ev.id === eventId); if (!s) return;
  const reg = m.datos.registros.get(eventId) || {}, porAl = reg.porAlumno || {};
  const al = new Map((S.rincon.alumnos || []).map(a => [a.id, a]));
  // Clases que se pueden recuperar: canceladas del mismo alumno, anteriores a esta y sin otra recuperación.
  const yaRecuperadas = new Map();
  for (const [id, r] of m.datos.registros) if (id !== eventId) for (const [a, x] of Object.entries(r.porAlumno || {})) if (x.estado === "recuperacion" && x.recuperaDe) yaRecuperadas.set(a + "|" + x.recuperaDe, id);
  const candidatas = alumnoId => m.consumos.filter(c => c.alumnoId === alumnoId && c.eventId !== eventId && ["cancelada", "cancelada_cuenta"].includes(c.estado)
    && c.fecha <= s.ev.date && !yaRecuperadas.has(alumnoId + "|" + c.eventId)).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  const filaAl = id => { const r = porAl[id] || {}, est = r.estado || "impartida", cand = candidatas(id);
    return `<fieldset class="field full persona" data-al="${esc(id)}"><legend>${esc(nombreCompleto(al.get(id) || { nombre: "?" }))}</legend>
      <div class="estados">${Object.entries(ETIQUETA).map(([k, l]) => `<label class="check"><input type="radio" name="e_${esc(id)}" value="${k}"${k === est ? " checked" : ""}> ${l}</label>`).join("")}</div>
      <div class="row2"><label class="field" data-recup>Recupera la clase del<select data-recupera>${cand.length ? cand.map(c => `<option value="${esc(c.eventId)}"${c.eventId === r.recuperaDe ? " selected" : ""}>${fechaCorta(c.fecha)} · ${ETIQUETA[c.estado]}</option>`).join("") : '<option value="">No hay clases canceladas para recuperar</option>'}</select></label>
      <label class="field">Nota (opcional)<input data-nota value="${esc(r.nota || "")}" maxlength="140" placeholder="Ej.: avisó tarde, urgencia familiar"></label></div></fieldset>`; };
  const ayuda = `<details class="ayuda"><summary>¿Qué cuenta cada estado?</summary><ul>
    <li><b>Impartida:</b> descuenta 1 del pack y se factura.</li><li><b>Cancelada (cuenta):</b> canceló tarde o no la recupera. Descuenta y se factura.</li>
    <li><b>Cancelada:</b> no descuenta ni se factura. Si la recupera más adelante, marca la nueva clase como Recuperación.</li>
    <li><b>Recuperación:</b> recupera una clase cancelada. La original y su recuperación cuentan 1 en total.</li>
    ${s.p.modalidad === "pareja" ? "<li>En pareja: si solo cuenta uno de los dos, en Irene se factura como clase individual.</li>" : ""}</ul></details>`;
  const md = modal(`
    <h2>Clase del ${fechaCorta(s.ev.date)} · ${esc(s.ev.start)}–${esc(s.ev.end)}</h2>
    <p class="muted">${esc(s.ev.title)} · ${esc(acad(s.academiaId).nombre)} · ${cap(s.p.modalidad)}${s.pasada ? "" : " · todavía no se ha dado"}</p>
    <form id="fc" class="fgrid" novalidate>
      ${s.p.alumnos.length ? s.p.alumnos.map(filaAl).join("") : ""}
      ${s.p.sinVincular.length ? `<p class="banner full">${s.p.sinVincular.map(n => "«" + esc(n) + "»").join(", ")} sin vincular: vincúlalo en «Nombres sin vincular» para poder marcar su estado.</p>` : ""}
      ${ayuda}
      <label class="field full">Contenido trabajado<input id="c_cont" value="${esc(reg.contenido || "")}" maxlength="200" placeholder="Ej.: Unidad 5, pretérito imperfecto"></label>
      <label class="field full">Observaciones<textarea id="c_obs" rows="3" maxlength="1000">${esc(reg.observaciones || "")}</textarea></label>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
    </form>`);
  const sync = () => md.querySelectorAll("[data-al]").forEach(fs => { fs.querySelector("[data-recup]").hidden = fs.querySelector("input[type=radio]:checked").value !== "recuperacion"; });
  md.querySelectorAll("input[type=radio]").forEach(r => r.onchange = sync); sync();
  md.querySelector("#fc").onsubmit = ev => {
    ev.preventDefault();
    const err = md.querySelector("#f_err"), fail = t => { err.textContent = t; err.hidden = false; };
    const nuevoPor = {};
    for (const fs of md.querySelectorAll("[data-al]")) {
      const id = fs.dataset.al, estado = fs.querySelector("input[type=radio]:checked").value, nota = fs.querySelector("[data-nota]").value.trim();
      const x = {};
      if (estado !== "impartida") x.estado = estado;
      if (estado === "recuperacion") { const o = fs.querySelector("[data-recupera]").value; if (!o) return fail(`${fs.querySelector("legend").textContent}: elige qué clase cancelada recupera.`); x.recuperaDe = o; }
      if (nota) x.nota = nota;
      if (porAl[id] && porAl[id].packId) x.packId = porAl[id].packId;
      if (Object.keys(x).length) nuevoPor[id] = x;
    }
    const contenido = md.querySelector("#c_cont").value.trim(), observaciones = md.querySelector("#c_obs").value.trim();
    const vacio = !Object.keys(nuevoPor).length && !contenido && !observaciones && !reg.participantes;
    const existe = m.datos.registros.has(eventId);
    if (vacio && !existe) { cerrarModal(); return; }
    const datos = vacio ? null : { ...(reg.participantes ? { participantes: reg.participantes } : {}), porAlumno: nuevoPor, contenido, observaciones };
    guardar([{ coleccion: "registrosClase", id: eventId, nuevo: !existe, datos }], "Estado de la clase", "Clase guardada.");
  };
}

/* ================= packs ================= */
const PLANTILLAS = {
  "spanish-with-irene": [{ id: "24", nombre: "Pack 24", clases: 24, meses: 6 }, { id: "36", nombre: "Pack 36", clases: 36, meses: 9 }],
  "lsi-karmele": [{ id: "adultos", nombre: "Pack adultos", categoria: "adultos", clases: 10, precio: 180, tarifaId: "lsi-adultos-2026" },
                  { id: "apoyo", nombre: "Pack apoyo", categoria: "apoyo", clases: 10, precio: 190, tarifaId: "lsi-apoyo-2026" }]
};
const ESTADO_PACK = { anterior: "Terminado (anterior)", activo: "En curso", renovar: "Aviso de renovación", urgente: "Aviso urgente", terminado: "Terminado", pendiente: "Pendiente de empezar", anulado: "Anulado" };
/** renovado = hay un pack posterior (no anulado) del mismo alumno */
const pillPack = (e, renovado) => {
  const fin = e.estado === "terminado";
  const cls = fin ? (renovado || e.pack.noRenueva ? "mute" : "urg") : { anterior: "mute", activo: "ok", renovar: "warn", urgente: "urg", pendiente: "mute", anulado: "mute" }[e.estado];
  return `<span class="pill ${cls}">${ESTADO_PACK[e.estado]}${fin ? (renovado ? " · renovado" : e.pack.noRenueva ? " · no renueva" : " · pendiente de renovar") : ""}</span>`;
};
function ticksPack(e, academiaId, big){
  const total = Math.max(e.disponibles, e.realizadas);
  let h = "";
  for (let i = 0; i < total; i++) h += `<i class="${i < e.previas ? "on prev" : i < e.realizadas ? "on" : ""}"></i>`;
  return `<span class="ticks ${academiaId === "lsi-karmele" ? "lsi" : ""}${["renovar", "urgente"].includes(e.estado) ? " alert" : ""}${big ? " big" : ""}" role="img" aria-label="${e.realizadas} de ${e.disponibles} clases">${h}</span>`;
}
const packById = id => (S.rincon.packs || []).find(p => p.id === id);
/** Color del nombre: amarillo con 6 clases restantes o menos, rojo con 2 o menos (o pack terminado sin renovar). Configurable. */
const coloresAviso = () => { const c = (S.rincon.config || []).find(x => x.id === "general"), u = (c && c.umbrales) || {};
  return { amarillo: Number.isInteger(u.amarillo) ? u.amarillo : 6, rojo: Number.isInteger(u.rojo) ? u.rojo : 2 }; };
function colorAlumno(alumnoId){
  const st = modelo().porAlumno.get(alumnoId);
  if (!st || st.alumno.modoPago === "por_clase" || st.alumno.estado === "finalizado") return "";
  if (st.pendienteRenovar) return "rojo";
  if (!st.actual || st.actual.estado === "pendiente") return "";
  const c = coloresAviso(), r = st.actual.restantes;
  return r <= c.rojo ? "rojo" : r <= c.amarillo ? "amarillo" : "";
}
const resaltado = id => { const c = colorAlumno(id); return c ? " resaltar " + c : ""; };
const sinId = ({ id, actualizadoEn, ...r }) => { void id; void actualizadoEn; return r; };

/** Nuevo pack, renovación o edición. */
function formPack(alumno, pack, opts = {}){
  const nuevo = !pack, ac = alumno.academiaId, plant = PLANTILLAS[ac] || [];
  const base = opts.renovarDe ? packById(opts.renovarDe) : null;
  const elegida = pack ? (plant.find(p => p.nombre === pack.nombre)?.id || "otro") : base ? (plant.find(p => p.nombre === base.nombre)?.id || "otro") : (plant[0]?.id || "otro");
  const v = pack || { nombre: "", clasesContratadas: "", fechaCompra: dayKey(new Date()), precio: null, consumidasPrevias: null };
  const stA = modelo().porAlumno.get(alumno.id);
  const primeraAg = stA && stA.consumos[0] ? stA.consumos[0].fecha : null;
  const tienePacks = (S.rincon.packs || []).some(p => p.alumnoId === alumno.id && (!pack || p.id !== pack.id));
  const desconocida = pack ? !!pack.fechaCompraDesconocida : !base;   // marcada siempre, salvo al renovar
  void tienePacks;
  const m = modal(`
    <h2>${nuevo ? (base ? "Renovar pack" : "Nuevo pack") : "Editar pack"} · ${esc(nombreCompleto(alumno))}</h2>
    ${base ? `<p class="muted">El pack nuevo empezará a contar cuando se termine el «${esc(base.nombre)}».</p>` : ""}
    <form id="fp" class="fgrid" novalidate>
      <label class="field full">Pack<select id="p_tipo">${plant.map(p => `<option value="${p.id}"${p.id === elegida ? " selected" : ""}>${esc(p.nombre)} · ${p.clases} clases${p.meses ? " · " + p.meses + " meses" : ""}${p.precio ? " · " + p.precio + " €" : ""}</option>`).join("")}<option value="otro"${elegida === "otro" ? " selected" : ""}>Otro</option></select></label>
      <label class="field" id="p_nombre_box">Nombre del pack<input id="p_nombre" value="${esc(v.nombre)}" maxlength="40" placeholder="Ej.: Pack 12"></label>
      <label class="field">Clases contratadas<input id="p_clases" type="number" min="1" step="1" value="${esc(v.clasesContratadas)}"></label>
      <div class="field">Fecha de compra
        <label class="check"><input type="checkbox" id="p_nose"${desconocida ? " checked" : ""}> No sé la fecha de compra</label>
        <input id="p_compra" type="date" value="${esc(v.fechaCompra)}">
        <span class="muted" id="p_nose_txt">Se contarán sus clases de la agenda desde la primera${primeraAg ? " (" + fechaCorta(primeraAg) + ")" : ""}.${ac === "lsi-karmele" ? " No entra en la factura del mes de LSI." : ""}</span></div>
      <label class="field"${ac === "lsi-karmele" ? "" : " hidden"}>Lo que cobras por el pack (€)<input id="p_precio" type="number" min="0" step="0.01" value="${v.precio && v.precio.importe != null ? v.precio.importe : ""}"></label>
      ${base ? "" : `<label class="field full">Clases de este pack ya gastadas antes de la agenda <span class="muted">Solo las que no están apuntadas en tu agenda. Si el pack es nuevo, déjalo vacío.</span>
        <input id="p_prev" type="number" min="0" step="1" value="${v.consumidasPrevias ? v.consumidasPrevias.clases : ""}" style="max-width:140px"></label>`}
      <p class="muted full" style="font-size:.82rem">${ac === "lsi-karmele" ? "En LSI el pack se factura entero en el mes de su fecha de compra." : "En Spanish with Irene facturas cada mes las clases dadas (17/19 € o 21/23 €). El pack solo sirve para controlar las clases que le quedan al alumno."}</p>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
    </form>`);
  const tipo = m.querySelector("#p_tipo");
  const aplicar = primera => {
    const p = plant.find(x => x.id === tipo.value);
    m.querySelector("#p_nombre_box").hidden = !!p;
    if (p && (!primera || nuevo)) { m.querySelector("#p_clases").value = p.clases; if (p.precio != null) m.querySelector("#p_precio").value = p.precio; }
  };
  tipo.onchange = () => aplicar(false); aplicar(true);
  const nose = m.querySelector("#p_nose"), syncNose = () => { m.querySelector("#p_compra").hidden = nose.checked; m.querySelector("#p_nose_txt").hidden = !nose.checked; };
  nose.onchange = syncNose; syncNose();
  m.querySelector("#fp").onsubmit = ev => {
    ev.preventDefault();
    const err = m.querySelector("#f_err"), fail = t => { err.textContent = t; err.hidden = false; };
    const p = plant.find(x => x.id === tipo.value);
    const nombre = p ? p.nombre : m.querySelector("#p_nombre").value.trim();
    const sinFecha = nose.checked;
    const clases = Number(m.querySelector("#p_clases").value), compra = sinFecha ? (primeraAg || dayKey(new Date())) : m.querySelector("#p_compra").value;
    const precioTxt = m.querySelector("#p_precio").value.trim(), precio = precioTxt === "" ? null : Number(precioTxt);
    const prevTxt = m.querySelector("#p_prev") ? m.querySelector("#p_prev").value.trim() : "", prev = prevTxt === "" ? 0 : Number(prevTxt);
    if (!nombre) return fail("Escribe un nombre para el pack.");
    if (!Number.isInteger(clases) || clases < 1) return fail("Las clases contratadas tienen que ser un número entero mayor que 0.");
    if (!compra) return fail("Indica la fecha de compra.");
    if (precio != null && (!Number.isFinite(precio) || precio < 0)) return fail("El precio no es válido.");
    if (ac === "lsi-karmele" && precio == null && !sinFecha) return fail("Indica lo que cobras por el pack: hace falta para la factura de LSI.");
    if (!Number.isInteger(prev) || prev < 0) return fail("Las clases ya gastadas tienen que ser un número entero.");
    if (prev > clases) return fail("Las clases ya gastadas no pueden ser más que las contratadas.");
    const datos = { ...(pack ? sinId(pack) : { alumnoId: alumno.id, noRenueva: null, estadoManual: null, creadoEn: Date.now(), renovacionDe: base ? base.id : null }),
      nombre, categoria: p && p.categoria || null, tarifaId: p && p.tarifaId || null, clasesContratadas: clases, fechaCompra: compra, fechaCompraDesconocida: sinFecha,
      precio: precio == null ? null : { importe: precio, moneda: "EUR" }, consumidasPrevias: prev > 0 ? { clases: prev } : null };
    const resumen = pack && pack.clasesContratadas !== clases ? { clasesContratadas: [pack.clasesContratadas, clases] } : null;
    guardar([...baseInicial(), { coleccion: "packs", id: pack ? pack.id : D.nuevoId("packs", "pk"), nuevo, datos, resumen }],
      nuevo ? (base ? "Renovación" : "Nuevo pack") : "Editar pack", nuevo ? (base ? `Renovación de ${alumno.nombre} guardada.` : `Pack de ${alumno.nombre} creado.`) : "Pack guardado.");
  };
}

/** Pack ya terminado antes de usar Mi rincón de profe: solo deja constancia. */
function formPackAnterior(alumno){
  const ac = alumno.academiaId, plant = PLANTILLAS[ac] || [], irene = ac === "spanish-with-irene";
  const prevActual = (alumno.clasesPreviasTarifa && alumno.clasesPreviasTarifa.clases) || 0;
  const m = modal(`
    <h2>Pack anterior · ${esc(nombreCompleto(alumno))}</h2>
    <p class="muted">Para dejar constancia de un pack que ya terminó antes de usar Mi rincón de profe. No descuenta clases de la agenda, no se factura y no genera avisos.</p>
    <form id="fh" class="fgrid" novalidate>
      <label class="field">Pack<select id="h_tipo">${plant.map(p => `<option value="${p.id}">${esc(p.nombre)} · ${p.clases} clases${p.meses ? " · " + p.meses + " meses" : ""}</option>`).join("")}<option value="otro">Otro</option></select></label>
      <label class="field">Clases<input id="h_clases" type="number" min="1" step="1" value="${plant[0] ? plant[0].clases : ""}"></label>
      <label class="field" id="h_nombre_box" hidden>Nombre del pack<input id="h_nombre" maxlength="40" placeholder="Ej.: Pack 12"></label>
      <label class="field">Periodo (opcional)<input id="h_periodo" maxlength="40" placeholder="Ej.: 6 meses · ene–jun 2025"></label>
      <label class="field">¿Cuántos packs así? <input id="h_n" type="number" min="1" max="10" step="1" value="1"></label>
      ${irene ? `<label class="check full"><input type="checkbox" id="h_sumar" checked> <span>Sumar estas clases a «Clases anteriormente dadas» (para cobrar 19/23 €): ahora ${prevActual} → <b id="h_total"></b></span></label>` : ""}
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Guardar</button></div>
    </form>`);
  const tipo = m.querySelector("#h_tipo"), cl = m.querySelector("#h_clases"), nn = m.querySelector("#h_n");
  const upd = () => { const p = plant.find(x => x.id === tipo.value); m.querySelector("#h_nombre_box").hidden = !!p;
    const t = m.querySelector("#h_total"); if (t) t.textContent = prevActual + (Number(cl.value) || 0) * (Number(nn.value) || 0); };
  const per = m.querySelector("#h_periodo"); let perAuto = true; per.oninput = () => { perAuto = false; };
  const ponPeriodo = () => { const p = plant.find(x => x.id === tipo.value); if (perAuto) per.value = p && p.meses ? p.meses + " meses" : ""; };
  tipo.onchange = () => { const p = plant.find(x => x.id === tipo.value); if (p) cl.value = p.clases; ponPeriodo(); upd(); };
  ponPeriodo();
  cl.oninput = upd; nn.oninput = upd; upd();
  m.querySelector("#fh").onsubmit = ev => {
    ev.preventDefault();
    const err = m.querySelector("#f_err"), fail = t => { err.textContent = t; err.hidden = false; };
    const p = plant.find(x => x.id === tipo.value), clases = Number(cl.value), n = Number(nn.value);
    const nombre = p ? p.nombre : m.querySelector("#h_nombre").value.trim(), periodo = m.querySelector("#h_periodo").value.trim();
    if (!nombre) return fail("Escribe un nombre para el pack.");
    if (!Number.isInteger(clases) || clases < 1) return fail("Las clases tienen que ser un número entero mayor que 0.");
    if (!Number.isInteger(n) || n < 1 || n > 10) return fail("El número de packs tiene que estar entre 1 y 10.");
    const cambios = [...baseInicial()];
    for (let i = 0; i < n; i++) cambios.push({ coleccion: "packs", id: D.nuevoId("packs", "pk"), nuevo: true, datos: { alumnoId: alumno.id, nombre, categoria: p && p.categoria || null,
      clasesContratadas: clases, fechaCompra: "2000-01-01", fechaCompraDesconocida: true, historico: true, periodo, precio: null, consumidasPrevias: null,
      noRenueva: null, estadoManual: null, renovacionDe: null, creadoEn: Date.now() - (n - i) } });
    const sumar = m.querySelector("#h_sumar");
    if (sumar && sumar.checked) cambios.push({ coleccion: "alumnos", id: alumno.id, datos: { ...sinId(alumno), clasesPreviasTarifa: { clases: prevActual + clases * n } },
      resumen: { clasesPreviasTarifa: [prevActual, prevActual + clases * n] } });
    guardar(cambios, "Pack anterior", n === 1 ? "Pack anterior guardado." : `${n} packs anteriores guardados.`);
  };
}

function formAjuste(alumno, pack){
  const m = modal(`
    <h2>Ajuste manual · ${esc(pack.nombre)}</h2>
    <p class="muted">Suma o resta clases disponibles a este pack, por ejemplo una clase regalada (+1) o una corrección (−1). Queda registrado con su motivo.</p>
    <form id="fa" class="fgrid" novalidate>
      <label class="field">Clases (+ o −)<input id="a_n" type="number" step="1" placeholder="+1 o -1"></label>
      <label class="field">Fecha<input id="a_f" type="date" value="${dayKey(new Date())}"></label>
      <label class="field full">Motivo<input id="a_m" maxlength="140" placeholder="Ej.: clase regalada por un problema con Zoom"></label>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Guardar ajuste</button></div>
    </form>`);
  m.querySelector("#fa").onsubmit = ev => {
    ev.preventDefault();
    const err = m.querySelector("#f_err"), fail = t => { err.textContent = t; err.hidden = false; };
    const n = Number(m.querySelector("#a_n").value), motivo = m.querySelector("#a_m").value.trim(), fecha = m.querySelector("#a_f").value;
    if (!Number.isInteger(n) || n === 0) return fail("Escribe un número entero distinto de 0, por ejemplo 1 o -1.");
    if (!motivo) return fail("El motivo es obligatorio.");
    guardar([{ coleccion: "ajustesPack", id: D.nuevoId("ajustesPack", "aj"), nuevo: true, datos: { packId: pack.id, alumnoId: alumno.id, cantidad: n, motivo, fecha } }],
      motivo, "Ajuste guardado.");
  };
}

/** Confirmación dentro de la página (el navegador no muestra confirm()). */
function confirmar(titulo, texto, boton, accion, peligro){
  const m = modal(`<h2>${esc(titulo)}</h2><p class="muted">${texto}</p>
    <label class="field" id="c_m_box">Motivo (opcional)<input id="c_m" maxlength="140"></label>
    <div class="mfoot"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="button" class="btn ${peligro ? "danger" : "primary"}" id="c_ok">${esc(boton)}</button></div>`);
  m.querySelector("#c_ok").onclick = () => accion(m.querySelector("#c_m").value.trim());
}
function accionPack(tipo, alumno, pack){
  const guarda = (cambios, mot, ok) => guardar(cambios, mot, ok);
  if (tipo === "norenueva") confirmar("No renueva", `${esc(alumno.nombre)} no renueva después del «${esc(pack.nombre)}». El aviso de renovación desaparecerá.`, "Guardar",
    motivo => guarda([{ coleccion: "packs", id: pack.id, datos: { ...sinId(pack), noRenueva: { fecha: dayKey(new Date()), motivo } } }], motivo || "No renueva", "Anotado: no renueva."));
  if (tipo === "sirenueva") guarda([{ coleccion: "packs", id: pack.id, datos: { ...sinId(pack), noRenueva: null } }], "Quitar «no renueva»", "Vuelve a aparecer como pendiente de renovar.");
  if (tipo === "anular") confirmar("Anular pack", `El «${esc(pack.nombre)}» dejará de descontar clases y no se facturará. Sus clases pasarán al pack siguiente o quedarán sin pack. Se puede deshacer.`, "Anular pack",
    motivo => guarda([{ coleccion: "packs", id: pack.id, datos: { ...sinId(pack), estadoManual: "anulado" } }], motivo || "Anular pack", "Pack anulado."), true);
  if (tipo === "eliminar") {
    const aj = (S.rincon.ajustesPack || []).filter(x => x.packId === pack.id);
    confirmar("Eliminar pack", `Se borrará el «${esc(pack.nombre)}» de ${esc(alumno.nombre)}${aj.length ? ` y sus ${plural(aj.length, "ajuste", "ajustes")}` : ""}. Las clases de la agenda no cambian: pasarán al pack siguiente o quedarán sin pack. No se puede deshacer.`, "Eliminar",
      motivo => guarda([{ coleccion: "packs", id: pack.id, datos: null }, ...aj.map(x => ({ coleccion: "ajustesPack", id: x.id, datos: null }))], motivo || "Eliminar pack", "Pack eliminado."), true);
  }
  if (tipo === "reactivar") guarda([{ coleccion: "packs", id: pack.id, datos: { ...sinId(pack), estadoManual: null } }], "Reactivar pack", "Pack reactivado.");
}

function tabPacks(a, st){
  const packs = st ? [...st.packs].reverse() : [];
  const ultimo = st && st.packs.filter(e => !e.anulado).slice(-1)[0];
  const puedeRenovar = ultimo && ["renovar", "urgente", "terminado"].includes(ultimo.estado);
  const ajustes = id => (S.rincon.ajustesPack || []).filter(x => x.packId === id).sort((x, y) => x.fecha < y.fecha ? 1 : -1);
  const acciones = (e, renovado) => !puedeEscribir() ? "" : e.historico ? `<div class="packacts"><button class="link danger-l" type="button" data-pk="eliminar" data-id="${e.pack.id}">Eliminar</button></div>` : `<div class="packacts">
      <button class="link" type="button" data-pk="editar" data-id="${e.pack.id}">Editar</button>
      <button class="link" type="button" data-pk="ajuste" data-id="${e.pack.id}">Ajuste manual</button>
      ${e.estado === "terminado" && !renovado ? (e.pack.noRenueva ? `<button class="link" type="button" data-pk="sirenueva" data-id="${e.pack.id}">Quitar «no renueva»</button>` : `<button class="link" type="button" data-pk="norenueva" data-id="${e.pack.id}">No renueva</button>`) : ""}
      ${e.anulado ? `<button class="link" type="button" data-pk="reactivar" data-id="${e.pack.id}">Reactivar</button>` : ""}
      <button class="link danger-l" type="button" data-pk="eliminar" data-id="${e.pack.id}">Eliminar</button></div>`;
  return `
    <div class="packtop">${puedeEscribir() ? `${puedeRenovar ? `<button class="btn primary sm" type="button" data-pk="renovar" data-id="${ultimo.pack.id}">Renovar</button>` : ""}<button class="btn sm ghost" type="button" data-pk="anterior">+ Pack anterior</button><button class="btn sm" type="button" data-pk="nuevo">+ Nuevo pack</button>` : ""}</div>
    ${a.modoPago === "por_clase" ? `<p class="note">Paga clase a clase: sus clases cuentan como sueltas. Si compra un pack, créalo aquí y las clases desde su fecha de compra se descontarán del pack.</p>` : ""}
    ${st && st.sinPack.length ? `<p class="banner">${plural(st.sinPack.length, "clase dada sin pack", "clases dadas sin pack")}: ${st.sinPack.slice(-5).map(c => fechaCorta(c.fecha)).join(", ")}${st.sinPack.length > 5 ? "…" : ""}. Crea o renueva un pack con una fecha de compra anterior para que se descuenten.</p>` : ""}
    ${st && st.antesDePacks.length ? `<p class="note">${plural(st.antesDePacks.length, "clase de la agenda es anterior", "clases de la agenda son anteriores")} a su primer pack registrado: no se descuentan de ningún pack.</p>` : ""}
    ${packs.length ? packs.map(e => { const renovado = e !== ultimo && !e.anulado; return `<article class="packcard">
        <header><div><h3>${esc(e.pack.nombre || "Pack")}</h3><span class="muted" style="font-size:.8rem">${e.historico ? `Antes de Mi rincón de profe${e.pack.periodo ? " · " + esc(e.pack.periodo) : ""}` : ""}${e.historico ? "" : "Compra: "}${e.historico ? "" : e.pack.fechaCompraDesconocida ? "fecha desconocida" : fechaCorta(e.pack.fechaCompra) + " " + e.pack.fechaCompra.slice(0, 4)}${e.pack.precio ? ` · ${String(e.pack.precio.importe).replace(".", ",")} €` : ""}${e.pack.renovacionDe ? " · renovación" : ""}</span></div>${pillPack(e, renovado)}</header>
        ${ticksPack(e, a.academiaId, true)}
        <dl class="packnums"><div><dt>Contratadas</dt><dd>${e.pack.clasesContratadas}${e.disponibles !== e.pack.clasesContratadas ? ` <small>(${e.disponibles > e.pack.clasesContratadas ? "+" : ""}${e.disponibles - e.pack.clasesContratadas} ajuste)</small>` : ""}</dd></div>
          <div><dt>Realizadas</dt><dd>${e.realizadas}${e.previas ? ` <small>(${e.previas} antes de la agenda)</small>` : ""}</dd></div>
          <div><dt>Restantes</dt><dd class="big">${e.restantes}</dd></div></dl>
        ${acciones(e, renovado)}
        ${e.asignadas.length || ajustes(e.pack.id).length ? `<details><summary>Historial de consumos (${e.asignadas.length} de la agenda${ajustes(e.pack.id).length ? `, ${plural(ajustes(e.pack.id).length, "ajuste", "ajustes")}` : ""})</summary>
          <ul class="hist">${ajustes(e.pack.id).map(x => `<li><span class="num">${fechaCorta(x.fecha)}</span><span>Ajuste: ${esc(x.motivo)}</span><b>${x.cantidad > 0 ? "+" : ""}${x.cantidad}</b></li>`).join("")}
          ${[...e.asignadas].reverse().map((c, i) => `<li><span class="num">${fechaCorta(c.fecha)}</span><span>${cap(c.modalidad)} · ${c.minutos} min${c.estado !== "impartida" ? " · " + esc(c.estado === "cancelada_cuenta" ? "cancelada (cuenta)" : c.estado) : ""}</span><span class="muted">${e.previas + e.asignadas.length - i}.ª</span></li>`).join("")}</ul></details>` : ""}
      </article>`; }).join("") : `<p class="empty">${a.modoPago === "por_clase" ? "Sin packs." : "Todavía no tiene ningún pack. Créalo con «+ Nuevo pack»."}</p>`}`;
}

/* ================= fusionar y eliminar fichas ================= */
/** Cambios para mover todo lo de la ficha «de» a la ficha «a» (o borrarlo si a = null). */
function cambiosFicha(de, a){
  const out = [];
  for (const z of S.rincon.alias || []) {
    if (z.alumnoId === de.id) out.push({ coleccion: "alias", id: z.id, datos: a ? { ...sinId(z), alumnoId: a.id } : null });
    else if ((z.alumnoIds || []).includes(de.id)) {
      if (a) out.push({ coleccion: "alias", id: z.id, datos: { ...sinId(z), alumnoIds: [...new Set(z.alumnoIds.map(x => x === de.id ? a.id : x))] } });
      else out.push({ coleccion: "alias", id: z.id, datos: null });   // el nombre de pareja vuelve a «Nombres sin vincular» para separarlo de nuevo
    }
  }
  for (const pk of S.rincon.packs || []) if (pk.alumnoId === de.id) {
    if (a) out.push({ coleccion: "packs", id: pk.id, datos: { ...sinId(pk), alumnoId: a.id } });
    else { out.push({ coleccion: "packs", id: pk.id, datos: null }); for (const x of S.rincon.ajustesPack || []) if (x.packId === pk.id) out.push({ coleccion: "ajustesPack", id: x.id, datos: null }); }
  }
  if (a) for (const x of S.rincon.ajustesPack || []) if (x.alumnoId === de.id) out.push({ coleccion: "ajustesPack", id: x.id, datos: { ...sinId(x), alumnoId: a.id } });
  for (const r of S.rincon.registrosClase || []) if (r.porAlumno && r.porAlumno[de.id]) {
    const por = { ...r.porAlumno }; const mio = por[de.id]; delete por[de.id];
    if (a && !por[a.id]) por[a.id] = mio;
    out.push({ coleccion: "registrosClase", id: r.id, datos: { ...sinId(r), porAlumno: por } });
  }
  for (const x of S.rincon.asignaciones || []) if (x.destino && x.destino.id === de.id) out.push({ coleccion: "asignaciones", id: x.id, datos: null });
  out.push({ coleccion: "alumnos", id: de.id, datos: null });
  return out;
}

function formFusionar(de){
  const otras = (S.rincon.alumnos || []).filter(x => x.id !== de.id && x.academiaId === de.academiaId).sort((x, y) => nombreCompleto(x).localeCompare(nombreCompleto(y), "es"));
  if (!otras.length) { flash(`No hay otra ficha de ${acad(de.academiaId).nombre} con la que fusionar.`); return; }
  const m = modal(`
    <h2>Fusionar «${esc(nombreCompleto(de))}» con otra ficha</h2>
    <p class="muted">Úsalo cuando la misma persona tiene dos fichas. Todo lo de esta ficha pasará a la que elijas: sus nombres de la agenda (también los de pareja, como «Colin- Nick»), sus packs y los estados de sus clases. Después, esta ficha desaparece.</p>
    <form id="fz" class="fgrid" novalidate>
      <label class="field full">Quedarse con la ficha de<select id="z_a">${otras.map(x => `<option value="${x.id}">${esc(nombreCompleto(x))} · ${esc(aliasDe(x.id).map(z => "«" + z.texto + "»").join(", ") || "sin nombres de agenda")}</option>`).join("")}</select></label>
      <p class="err full" id="f_err" hidden></p>
      <div class="mfoot full"><button type="button" class="btn ghost" data-cerrar>Cancelar</button><button type="submit" class="btn primary">Fusionar</button></div>
    </form>`);
  m.querySelector("#fz").onsubmit = ev => {
    ev.preventDefault();
    const a = otras.find(x => x.id === m.querySelector("#z_a").value);
    const extra = {};
    for (const k of ["apellidos", "nivelInicial", "nacionalidad", "lenguaMaterna", "clasesPreviasTarifa"]) if (!a[k] && de[k]) extra[k] = de[k];
    const cambios = cambiosFicha(de, a);
    if (Object.keys(extra).length) cambios.push({ coleccion: "alumnos", id: a.id, datos: { ...sinId(a), ...extra } });
    if (fichaAbierta === de.id) fichaAbierta = a.id;
    guardar(cambios, `Fusionar ${nombreCompleto(de)} con ${nombreCompleto(a)}`, `Fichas fusionadas: ahora todo está en ${nombreCompleto(a)}.`);
  };
}

function eliminarFicha(de){
  const nPacks = (S.rincon.packs || []).filter(x => x.alumnoId === de.id).length;
  const pareja = (S.rincon.alias || []).filter(z => (z.alumnoIds || []).includes(de.id));
  confirmar("Eliminar ficha", `Se borrará la ficha de <b>${esc(nombreCompleto(de))}</b>${nPacks ? ` con ${plural(nPacks, "pack", "packs")}` : ""}. Sus nombres de la agenda volverán a «Nombres sin vincular»${pareja.length ? `, también ${pareja.map(z => "«" + esc(z.texto) + "»").join(", ")}, que tendrás que separar de nuevo` : ""}. La agenda no cambia. No se puede deshacer.<br><br>Si es la misma persona que otra ficha, mejor usa <b>Fusionar</b>.`, "Eliminar ficha",
    motivo => { cerrarFicha(); guardar(cambiosFicha(de, null), motivo || "Eliminar ficha", `Ficha de ${nombreCompleto(de)} eliminada.`); }, true);
}

/* ================= ficha del alumno ================= */
let fichaAbierta = null, fichaTab = "resumen";
function abrirFicha(id, tab = "resumen"){ fichaAbierta = id; fichaTab = tab; pintarFicha(); }
function cerrarFicha(){ fichaAbierta = null; $("#drawerRoot").innerHTML = ""; }
function pintarFicha(){
  const a = (S.rincon.alumnos || []).find(x => x.id === fichaAbierta);
  if (!a) { cerrarFicha(); return; }
  const st = modelo().porAlumno.get(a.id), ac = acad(a.academiaId);
  const clases = (st ? st.consumos : []).slice().reverse();
  const dadas = clases.filter(c => !c.prevista);
  const tabs = [["resumen", "Resumen"], ["academica", "Información académica"], ["packs", "Packs"], ["historial", "Historial"], ["seguimiento", "Seguimiento"], ["notas", "Notas"]];
  const fila = c => { const r = modelo().datos.registros.get(c.eventId); return `<li class="clic" data-clase="${esc(c.eventId)}" tabindex="0"><span class="num">${fechaCorta(c.fecha)}</span><span>${cap(c.modalidad)} · ${c.minutos} min${r && r.contenido ? ` · <span class="muted">${esc(r.contenido)}</span>` : ""}${c.nota ? ` · <span class="muted">${esc(c.nota)}</span>` : ""}</span>${etiquetaConsumo(c)}</li>`; };
  let body;
  if (fichaTab === "resumen") body = `
    <dl class="facts">
      <div><dt>Academia</dt><dd>${esc(ac.nombre)}</dd></div><div><dt>Estado</dt><dd>${esc(ESTADOS_ALUMNO[a.estado] || a.estado || "—")}</dd></div>
      <div><dt>Nivel inicial</dt><dd>${esc(a.nivelInicial || "—")}</dd></div><div><dt>Forma de pago</dt><dd>${a.modoPago === "por_clase" ? "Clase a clase" : "Con pack"}</dd></div>
      <div><dt>Profesora</dt><dd>Sara</dd></div><div><dt>Primera clase en la agenda</dt><dd>${st && st.consumos[0] ? fechaCorta(st.consumos[0].fecha) + " " + st.consumos[0].fecha.slice(0, 4) : "—"}</dd></div>
      <div><dt>Nacionalidad</dt><dd>${esc(a.nacionalidad || "—")}</dd></div><div><dt>Lengua materna</dt><dd>${esc(a.lenguaMaterna || "—")}</dd></div>
      ${a.academiaId === "spanish-with-irene" ? `<div><dt>Clases anteriormente dadas</dt><dd>${a.clasesPreviasTarifa ? a.clasesPreviasTarifa.clases : 0}</dd></div>
      <div><dt>Clases en total contigo</dt><dd>${st ? st.totalTarifa : 0} ${st && st.totalTarifa >= 12 ? "· ya cobras 19/23 €" : "· 17/21 € hasta la 12"}</dd></div>` : ""}
    </dl>
    <section class="section"><header><h3>${st && st.actual ? esc(st.actual.pack.nombre || "Pack actual") : a.modoPago === "por_clase" ? "Clase a clase" : "Pack"}</h3><button class="link" type="button" data-tab="packs">Ver packs</button></header>
      ${st && st.actual ? `${ticksPack(st.actual, a.academiaId, true)}<p><b class="num">${st.actual.realizadas}</b> de ${st.actual.disponibles} realizadas · <b class="num">${st.actual.restantes}</b> ${st.actual.restantes === 1 ? "restante" : "restantes"} · ${pillPack(st.actual)}</p>`
        : `<p class="empty">${a.modoPago === "por_clase" ? "Paga clase a clase." : "Todavía no tiene pack."}</p>`}
    </section>
    <section class="section"><header><h3>Nombres en la agenda</h3></header>
      ${aliasDe(a.id).length ? `<ul class="hist">${aliasDe(a.id).map(z => `<li><span>«${esc(z.texto)}»</span><span class="muted">${esc(acad(z.academiaId).corto)}</span>${puedeEscribir() ? `<button class="link" type="button" data-unalias="${esc(z.id)}">Desvincular</button>` : "<span></span>"}</li>`).join("")}</ul>` : `<p class="empty">Ningún nombre de la agenda está vinculado a esta ficha todavía.</p>`}
    </section>
    <section class="section"><header><h3>Últimas clases</h3><span class="muted" style="font-size:.8rem">${plural(dadas.length, "clase dada", "clases dadas")} en la agenda${a.clasesPreviasTarifa && a.clasesPreviasTarifa.clases ? ` + ${a.clasesPreviasTarifa.clases} anteriores` : ""}</span></header>
      ${clases.length ? `<ul class="hist">${clases.slice(0, 8).map(fila).join("")}</ul>` : `<p class="empty">Sin clases en la agenda.</p>`}</section>
    ${puedeEscribir() ? `<div class="packacts gestion"><button class="link" type="button" id="f_fusion">Fusionar con otra ficha</button><button class="link danger-l" type="button" id="f_borrar">Eliminar ficha</button></div>` : ""}`;
  else if (fichaTab === "packs") body = tabPacks(a, st);
  else if (fichaTab === "historial") body = clases.length ? `<ul class="hist">${clases.map(fila).join("")}</ul>` : `<p class="empty">Sin clases en la agenda.</p>`;
  else body = `<p class="phase" style="align-self:flex-start">Próximo paso</p><p class="muted">La pestaña «${esc(tabs.find(t => t[0] === fichaTab)[1])}» llega en los siguientes pasos.</p>`;
  const antes = $("#drawerRoot .dbody"), scrollFicha = antes && antes.dataset.k === fichaAbierta + "|" + fichaTab ? antes.scrollTop : 0;
  $("#drawerRoot").innerHTML = `<div class="scrim" id="fscrim"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Ficha de ${esc(nombreCompleto(a))}">
      <div class="dh"><span class="avatar ${ac.css}">${esc((a.nombre[0] || "") + ((a.apellidos || "")[0] || ""))}</span><div><span class="eyebrow">Ficha de alumno</span><h2><span class="name${resaltado(a.id)}">${esc(nombreCompleto(a))}</span></h2><div style="margin-top:6px">${chip(a.academiaId)}</div></div>
        <div class="dh-actions">${puedeEscribir() ? `<button class="btn sm" type="button" id="f_edit">Editar</button>` : ""}<button class="x" type="button" id="f_close" aria-label="Cerrar ficha"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${fichaTab === k}">${l}</button>`).join("")}</div>
      <div class="dbody" data-k="${esc(fichaAbierta + "|" + fichaTab)}">${body}</div>
    </aside>`;
  if (scrollFicha) $("#drawerRoot .dbody").scrollTop = scrollFicha;
  $("#fscrim").onclick = cerrarFicha; $("#f_close").onclick = cerrarFicha;
  const ed = $("#f_edit"); if (ed) ed.onclick = () => formFicha(a);
  const fu = $("#f_fusion"); if (fu) fu.onclick = () => formFusionar(a);
  const fb = $("#f_borrar"); if (fb) fb.onclick = () => eliminarFicha(a);
  document.querySelectorAll("#drawerRoot [data-clase]").forEach(li => { li.onclick = () => formClase(li.dataset.clase); li.onkeydown = e => { if (e.key === "Enter") formClase(li.dataset.clase); }; });
  document.querySelectorAll("#drawerRoot [data-pk]").forEach(b => b.onclick = () => {
    const pk = b.dataset.id ? packById(b.dataset.id) : null, t = b.dataset.pk;
    if (t === "nuevo") formPack(a, null);
    else if (t === "anterior") formPackAnterior(a);
    else if (t === "renovar") formPack(a, null, { renovarDe: pk.id });
    else if (t === "editar") formPack(a, pk);
    else if (t === "ajuste") formAjuste(a, pk);
    else accionPack(t, a, pk);
  });
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { fichaTab = b.dataset.tab; pintarFicha(); });
  document.querySelectorAll("[data-unalias]").forEach(b => b.onclick = () => { const z = aliasDe(a.id).find(q => q.id === b.dataset.unalias); if (z) quitarAlias(z); });
}

/* ================= router y pantallas ================= */
const VISTAS = { inicio: vInicio, calendario: vCalendario, "profe-resumen": vProfeResumen, "profe-alumnos": vProfeAlumnos, "profe-vincular": vVincular,
  "profe-historial": vHistorial, "conf-tipos": vTipos, "conf-academias": vAcademias, "profe-packs": vPacks, "conf-preferencias": vPreferencias };

/** Agrupa los datos que llegan de golpe (por ejemplo al volver a la ventana) en un solo redibujado. */
let renderPendiente = false;
function programarRender(){
  if (renderPendiente) return;
  renderPendiente = true;
  requestAnimationFrame(() => { renderPendiente = false; render(); });   // con la ventana minimizada espera a que vuelva
}
function render(){
  const act = document.activeElement, foco = act && act.id && $("#view") && $("#view").contains(act) ? { id: act.id, ini: act.selectionStart, fin: act.selectionEnd } : null;
  pintar();
  if (foco) { const n = document.getElementById(foco.id); if (n && n !== document.activeElement) { n.focus(); try { if (foco.ini != null) n.setSelectionRange(foco.ini, foco.fin); } catch (e) {} } }
}
function pintar(){
  const app = $("#app"), login = $("#login"), boot = $("#boot");
  boot.hidden = !(S.sesion === "cargando" || ((S.sesion === "dentro" || S.sesion === "demo") && !S.agenda && !S.agendaError));
  login.hidden = S.sesion !== "fuera";
  app.hidden = boot.hidden === false || S.sesion === "fuera";
  if (app.hidden) return;
  let id = location.hash.slice(1);
  if (!VISTAS[id] && !PEND[id]) id = "inicio";
  renderNav(id);
  const v = $("#view");
  v.innerHTML = VISTAS[id] ? VISTAS[id]() : vPend(id);
  v.style.setProperty("--accent", id.startsWith("coord") ? "var(--oliva)" : "var(--burdeos)");
  v.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { location.hash = b.dataset.go; });
  v.querySelectorAll("[data-ac]").forEach(b => b.onclick = () => { acFilter = b.dataset.ac; try { localStorage.setItem("rincon-ac", acFilter); } catch (e) {} render(); });
  v.querySelectorAll("[data-mes]").forEach(b => b.onclick = () => { mesHist = sumarMes(mesHist, Number(b.dataset.mes)); render(); });
  // Nombres sin vincular
  const sv = id => modelo().sinVincular.find(x => x.aliasId === id);
  const primera = x => x.eventos.map(id => modelo().eventos.find(e => e.id === id)).filter(Boolean).map(e => e.date).sort()[0];
  v.querySelectorAll("[data-crear]").forEach(b => b.onclick = () => { const x = sv(b.dataset.crear); if (x) formFicha(null, { nombre: x.texto, academiaId: x.academiaId, aliasTexto: x.texto, fechaIncorporacion: primera(x) || dayKey(new Date()) }); });
  v.querySelectorAll("[data-vincular]").forEach(b => b.onclick = () => { const x = sv(b.dataset.vincular); if (x) formVincular(x); });
  v.querySelectorAll("[data-separar]").forEach(b => b.onclick = () => { const x = sv(b.dataset.separar); if (x) formSeparar(x); });
  // Mis alumnos
  v.querySelectorAll("[data-ficha]").forEach(tr => { tr.onclick = () => abrirFicha(tr.dataset.ficha); tr.onkeydown = e => { if (e.key === "Enter") abrirFicha(tr.dataset.ficha); }; });
  const na = v.querySelector("#nuevoAl"); if (na) na.onclick = () => formFicha(null);
  const fq = v.querySelector("#fq");
  if (fq) {
    fq.oninput = () => { fAl.q = fq.value; const p = fq.selectionStart; render(); const n = $("#fq"); n.focus(); n.setSelectionRange(p, p); };
    [["fnivel", "nivel"], ["festado", "estado"], ["fpago", "pago"]].forEach(([id, k]) => v.querySelector("#" + id).onchange = e => { fAl[k] = e.target.value; render(); });
  }
  const ct = v.querySelector("#confirmarTipos"); if (ct) ct.onclick = () => guardar(baseInicial(), "Configuración inicial", "Configuración guardada: academias, tarifas y avisos.");
  v.querySelectorAll("[data-fichapk]").forEach(b => b.onclick = () => abrirFicha(b.dataset.fichapk, "packs"));
  v.querySelectorAll("[data-clase]").forEach(tr => { tr.onclick = () => formClase(tr.dataset.clase); tr.onkeydown = e => { if (e.key === "Enter") formClase(tr.dataset.clase); }; });
  const pf = v.querySelector("#prefs");
  if (pf) pf.onsubmit = ev => {
    ev.preventDefault();
    const ren = Number(pf.querySelector("#u_ren").value), urg = Number(pf.querySelector("#u_urg").value), ama = Number(pf.querySelector("#u_ama").value), rojo = Number(pf.querySelector("#u_rojo").value), err = pf.querySelector("#f_err");
    if (!Number.isInteger(ama) || !Number.isInteger(rojo) || rojo < 0 || rojo >= ama) { err.textContent = "El número del rojo tiene que ser menor que el del amarillo, por ejemplo 6 y 2."; err.hidden = false; return; }
    if (!Number.isInteger(ren) || !Number.isInteger(urg) || ren < 1 || urg < 0 || urg >= ren) { err.textContent = "El aviso urgente tiene que ser menor que el de renovación, por ejemplo 3 y 1."; err.hidden = false; return; }
    const base = baseInicial(), cfg = (S.rincon.config || []).find(c => c.id === "general"), ini = base.find(c => c.coleccion === "config");
    const datos = { ...(cfg ? sinId(cfg) : ini.datos), umbrales: { renovacion: ren, urgente: urg, amarillo: ama, rojo } };
    guardar([...base.filter(c => c.coleccion !== "config"), { coleccion: "config", id: "general", nuevo: !cfg, datos }], "Cambiar avisos de renovación", "Avisos guardados.");
  };
  if (fichaAbierta) pintarFicha();
  document.body.classList.remove("menu-open");
}

/* ================= arranque ================= */
let lastHash = location.hash;
window.addEventListener("hashchange", () => { const same = location.hash === lastHash; lastHash = location.hash; render(); if (!same) window.scrollTo(0, 0); });
$("#menuBtn").onclick = () => document.body.classList.add("menu-open");
let finResize = null;
window.addEventListener("resize", () => {
  document.body.classList.add("resizing");
  if (window.innerWidth > 860) document.body.classList.remove("menu-open");
  clearTimeout(finResize); finResize = setTimeout(() => document.body.classList.remove("resizing"), 250);
});
$("#scrimMenu").onclick = () => document.body.classList.remove("menu-open");
document.addEventListener("keydown", e => { if (e.key === "Escape") document.body.classList.remove("menu-open"); });

$("#loginForm").onsubmit = async ev => {
  ev.preventDefault();
  const err = $("#lg_err"), btn = $("#lg_btn"), u = $("#lg_user").value.trim(), p = $("#lg_pass").value;
  err.hidden = true;
  const fail = msg => { err.textContent = msg; err.hidden = false; };
  if (!u || !p) return fail("Escribe tu usuario y tu contraseña.");
  btn.disabled = true; btn.textContent = "Entrando…";
  try { await D.entrar(u, p); $("#lg_pass").value = ""; }
  catch (e) {
    const c = e && e.code || "";
    fail(c === "auth/too-many-requests" ? "Demasiados intentos. Espera unos minutos y vuelve a intentarlo."
      : c === "auth/network-request-failed" ? "No hay conexión a internet. Revisa tu conexión y vuelve a intentarlo."
      : "Usuario o contraseña incorrectos. Son los mismos que usas en la agenda.");
  } finally { btn.disabled = false; btn.textContent = "Entrar"; }
};

async function arrancar(){
  render();
  if (DEMO) {
    const { agendaDemo } = await import("./demo.js?v=2026-11-28e");
    // Guardado de prueba: solo en memoria, se pierde al recargar.
    D = {
      nuevoId: (c, p) => p + "_" + Math.random().toString(36).slice(2, 12),
      esPermisoDenegado: () => false,
      guardar: async cambios => {
        for (const c of cambios) {
          const arr = S.rincon[c.coleccion] || (S.rincon[c.coleccion] = []);
          const i = arr.findIndex(x => x.id === c.id);
          if (c.datos === null) { if (i >= 0) arr.splice(i, 1); }
          else if (i >= 0) arr[i] = { ...c.datos, id: c.id }; else arr.push({ ...c.datos, id: c.id });
        }
        invalidar(); render();
      }
    };
    for (const c of ["config", "academias", "tarifas", "profesores", "alumnos", "alias", "grupos", "asignaciones", "packs", "ajustesPack", "registrosClase"]) S.rincon[c] = [];
    S.agenda = agendaDemo(); invalidar(); render(); return;
  }
  try {
    D = await import("./datos.js?v=2026-11-28e");
    await D.iniciar();
  } catch (e) {
    $("#boot").textContent = "No se pudo conectar. Revisa tu conexión a internet y recarga la página.";
    return;
  }
  D.alCambiarSesion(user => {
    D.parar();
    S.agenda = null; S.agendaError = ""; S.rincon = {}; S.rinconDenegado = false; invalidar();
    if (!user) { S.sesion = "fuera"; render(); setTimeout(() => $("#lg_user")?.focus(), 0); return; }
    S.sesion = "dentro"; render();
    D.escucharAgenda(items => { S.agenda = items; invalidar(); programarRender(); },
      e => { S.agendaError = D.esPermisoDenegado(e) ? "Tu usuario no tiene permiso para leer la agenda." : "Revisa tu conexión."; render(); });
    D.escucharRincon((col, docs) => { S.rincon[col] = docs; S.rinconDenegado = false; invalidar(); programarRender(); },
      (col, e) => { if (D.esPermisoDenegado(e)) { S.rinconDenegado = true; programarRender(); } });
  });
}
arrancar();
