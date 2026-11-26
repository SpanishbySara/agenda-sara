// Mi rincón de profe · interfaz
import { calcular, eventosValidos, academiaDeEvento, participantes, aliasId, esPasada, duracion, dayKey, mins } from "./calculo.js";

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
  </div>`).join("") + (S.sesion === "dentro" ? `<button class="nav" type="button" id="logout">${ic("out")}<span>Cerrar sesión</span></button>` : "");
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
  if (S.sesion === "demo") return `<div class="banner demo-b"><b>Modo demostración.</b> Agenda inventada: no se conecta a Firebase ni a tu agenda real.</div>`;
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
    if (st.pendienteRenovar) avisos.push({ cls: "urgent", t: a.nombre, s: "Pack terminado. ¿Renueva?" });
    else if (st.actual && ["urgente", "renovar"].includes(st.actual.estado)) avisos.push({ cls: st.actual.estado === "urgente" ? "urgent" : "", t: a.nombre, s: `${st.actual.restantes === 1 ? "Queda 1 clase" : "Quedan " + st.actual.restantes + " clases"} del ${st.actual.pack.nombre || "pack"}` });
    void id;
  }
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

function vProfeAlumnos(){
  const al = (S.rincon.alumnos || []).filter(a => pasaFiltro(a.academiaId));
  const m = modelo();
  return `${aviso()}
  ${head("Mi espacio de profe", "Mis alumnos", "Pulsa un alumno para abrir su ficha. Las clases realizadas salen de tu agenda.", acSeg(), "var(--burdeos)")}
  ${al.length ? `<div class="twrap"><table><thead><tr><th>Alumno</th><th>Academia</th><th>Nivel</th><th>Estado</th></tr></thead>
    <tbody>${al.map(a => `<tr><td><span class="name">${esc(a.nombre)}</span></td><td>${chip(a.academiaId)}</td><td>${esc(a.nivelInicial || "—")}</td><td>${esc(a.estado || "")}</td></tr>`).join("")}</tbody></table></div>`
    : `<div class="emptybox"><h2>Todavía no hay fichas</h2><p>Tu agenda tiene ${plural(m.sinVincular.length, "nombre", "nombres")} de alumnos de LSI e Irene. En el siguiente paso podrás crear sus fichas desde <b>Nombres sin vincular</b>, sin escribirlos uno a uno.</p><button class="go" type="button" data-go="profe-vincular">Ver nombres de la agenda</button></div>`}`;
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
      <td style="white-space:nowrap"><button class="btn sm" type="button" disabled title="Disponible en el siguiente paso">Crear ficha</button> <button class="btn sm ghost" type="button" disabled title="Disponible en el siguiente paso">Vincular</button></td></tr>`).join("")}</tbody></table></div>
    <p class="note">«Crear ficha» y «Vincular a una ficha existente» se activan en el siguiente paso, cuando estén publicadas las reglas nuevas.</p>`
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
    <tbody>${ses.map(s => `<tr class="static"><td>${fechaCorta(s.ev.date)}</td><td class="num">${esc(s.ev.start)}–${esc(s.ev.end)}</td><td>${chip(s.academiaId)}</td><td>${nombresSesion(s)}</td>
      <td>${cap(s.p.modalidad)}</td><td class="n">${duracion(s.ev)} min</td><td>${s.pasada ? '<span class="state st-activo">Impartida</span>' : '<span class="state st-pausa">Prevista</span>'}</td></tr>`).join("")}</tbody></table></div>
    <p class="note">Marcar cancelaciones y recuperaciones llega en un paso posterior. Por ahora, toda clase pasada cuenta como impartida.</p>`
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
  ${ac.some(a => a.detectado) ? `<p class="note">${ac.every(a => a.tiposAgenda.length) ? "Detectado automáticamente por el nombre del tipo. En el siguiente paso podrás confirmarlo y quedará guardado por su identificador, así que renombrar el tipo en la agenda no romperá nada." : "No encuentro alguno de los tipos. Revisa que en tu agenda se llamen «Clases (LSI)» y «Clases (Irene)»."}</p>` : ""}
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

const PEND = {
  "profe-packs": ["Mi espacio de profe", "Packs y renovaciones", "Crear packs, renovaciones, clases ya consumidas y avisos de 3 y 1 clases."],
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
  "conf-estados": ["Configuración", "Estados", "Estados de alumnos, packs y clases."],
  "conf-preferencias": ["Configuración", "Preferencias", "Umbrales de aviso, exportación y copia de seguridad."]
};
function vPend(id){
  const [eyebrow, title, intro] = PEND[id];
  const col = eyebrow === "Jefa de estudios" ? "var(--oliva)" : eyebrow === "Mi espacio de profe" ? "var(--burdeos)" : "";
  return `${aviso()}${head(eyebrow, title, esc(intro), `<span class="phase">${eyebrow === "Jefa de estudios" ? "Fase 5" : "Próximos pasos de la fase 4"}</span>`, col)}`;
}

/* ================= router y pantallas ================= */
const VISTAS = { inicio: vInicio, calendario: vCalendario, "profe-resumen": vProfeResumen, "profe-alumnos": vProfeAlumnos, "profe-vincular": vVincular,
  "profe-historial": vHistorial, "conf-tipos": vTipos, "conf-academias": vAcademias };

function render(){
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
  document.body.classList.remove("menu-open");
}

/* ================= arranque ================= */
let lastHash = location.hash;
window.addEventListener("hashchange", () => { const same = location.hash === lastHash; lastHash = location.hash; render(); if (!same) window.scrollTo(0, 0); });
$("#menuBtn").onclick = () => document.body.classList.add("menu-open");
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
    const { agendaDemo } = await import("./demo.js");
    S.agenda = agendaDemo(); invalidar(); render(); return;
  }
  try {
    D = await import("./datos.js");
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
    D.escucharAgenda(items => { S.agenda = items; invalidar(); render(); },
      e => { S.agendaError = D.esPermisoDenegado(e) ? "Tu usuario no tiene permiso para leer la agenda." : "Revisa tu conexión."; render(); });
    D.escucharRincon((col, docs) => { S.rincon[col] = docs; S.rinconDenegado = false; invalidar(); render(); },
      (col, e) => { if (D.esPermisoDenegado(e)) { S.rinconDenegado = true; render(); } });
  });
}
arrancar();
