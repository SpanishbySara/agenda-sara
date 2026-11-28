// Mi rincón de profe · matching de parejas y grupos
// ------------------------------------------------------------------
// Funciones puras: proponen agrupaciones y explican por qué. Nunca crean
// nada: la decisión siempre es de la jefa de estudios.

const NIVELES = ["A1", "A2", "B1"];
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const mins = t => { const [h, m] = (t || "0:0").split(":").map(Number); return h * 60 + m; };
const hhmm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const VACIAS = new Set(["para", "como", "pero", "porque", "sobre", "entre", "desde", "hasta", "mucho", "poder", "quiere", "quiero", "tiene", "hacer", "mejorar", "español", "espanol", "clases", "clase", "nivel"]);
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palabras con significado de objetivo y aficiones (4 letras o más, sin palabras vacías). */
export const palabras = texto => new Set(norm(texto).split(/[^a-zñ]+/).filter(w => w.length >= 4 && !VACIAS.has(w)));

/** Huecos comunes entre varias listas de franjas [{dia, inicio, fin}]. */
export function coincidencias(listas){
  let comun = listas[0] || [];
  for (const otra of listas.slice(1)) {
    const out = [];
    for (const a of comun) for (const b of otra) {
      if (a.dia !== b.dia) continue;
      const ini = Math.max(mins(a.inicio), mins(b.inicio)), fin = Math.min(mins(a.fin), mins(b.fin));
      if (fin > ini) out.push({ dia: a.dia, inicio: hhmm(ini), fin: hhmm(fin) });
    }
    comun = out;
  }
  return comun.sort((a, b) => a.dia - b.dia || mins(a.inicio) - mins(b.inicio));
}
export const textoHuecos = hs => hs.map(h => `${DIAS[h.dia]} ${h.inicio}–${h.fin}`).join(", ");
const maxHueco = hs => hs.reduce((m, h) => Math.max(m, mins(h.fin) - mins(h.inicio)), 0);

/** Sin hueco común: baja. Sin saber la disponibilidad de alguno: como mucho media. */
export function compatibilidad(puntos, sinHueco, faltaDisp){
  if (sinHueco) return "baja";
  const c = puntos >= 70 ? "alta" : puntos >= 45 ? "media" : "baja";
  return faltaDisp && c === "alta" ? "media" : c;
}

/**
 * Puntúa una pareja.
 * a, b: { id, nombre, nivel, edad, franjas, profesorId, texto }
 */
export function puntuarPareja(a, b){
  const motivos = [], avisos = [];
  let p = 0;
  // Nivel
  const ia = NIVELES.indexOf(a.nivel), ib = NIVELES.indexOf(b.nivel);
  if (ia < 0 || ib < 0) { p += 10; avisos.push("Falta el nivel de " + (ia < 0 ? a.nombre : b.nombre)); }
  else if (ia === ib) { p += 35; motivos.push(`Mismo nivel (${a.nivel})`); }
  else if (Math.abs(ia - ib) === 1) { p += 15; motivos.push(`Niveles contiguos (${a.nivel} y ${b.nivel})`); }
  else avisos.push(`Niveles distintos (${a.nivel} y ${b.nivel})`);
  // Disponibilidad
  const tienenA = (a.franjas || []).length > 0, tienenB = (b.franjas || []).length > 0;
  let huecos = [], sinHueco = false;
  if (tienenA && tienenB) {
    huecos = coincidencias([a.franjas, b.franjas]);
    if (!huecos.length) { sinHueco = true; avisos.push("No coinciden en ningún hueco de su disponibilidad"); }
    else if (maxHueco(huecos) >= 60) { p += 30; motivos.push("Coinciden: " + textoHuecos(huecos)); }
    else { p += 10; motivos.push("Coinciden menos de 1 hora: " + textoHuecos(huecos)); }
  } else { p += 10; avisos.push("Falta la disponibilidad de " + [!tienenA && a.nombre, !tienenB && b.nombre].filter(Boolean).join(" y ")); }
  // Edad
  if (Number.isInteger(a.edad) && Number.isInteger(b.edad)) {
    const d = Math.abs(a.edad - b.edad);
    if (d <= 8) { p += 15; motivos.push(`Edades parecidas (${a.edad} y ${b.edad})`); }
    else if (d <= 15) { p += 8; motivos.push(`${d} años de diferencia`); }
    else avisos.push(`${d} años de diferencia`);
  } else p += 7;
  // Profesora
  if (a.profesorId && a.profesorId === b.profesorId) { p += 10; motivos.push("Misma profesora"); }
  else if (!a.profesorId || !b.profesorId) p += 7;
  else { p += 3; avisos.push("Tienen profesoras distintas"); }
  // Objetivos y aficiones
  const comunes = [...palabras(a.texto)].filter(w => palabras(b.texto).has(w));
  if (comunes.length) { p += Math.min(10, comunes.length * 5); motivos.push("En común: " + comunes.slice(0, 3).join(", ")); }
  return { puntos: p, compatibilidad: compatibilidad(p, sinHueco, !(tienenA && tienenB)), motivos, avisos, huecos, sinHueco };
}

/** Puntúa un grupo de 3 o 4: la media de sus parejas, con huecos comunes a todos. */
export function puntuarGrupo(miembros){
  const pares = [];
  for (let i = 0; i < miembros.length; i++) for (let j = i + 1; j < miembros.length; j++) pares.push(puntuarPareja(miembros[i], miembros[j]));
  const puntos = Math.round(pares.reduce((t, x) => t + x.puntos, 0) / pares.length);
  const motivos = [], avisos = [];
  const niveles = [...new Set(miembros.map(m => m.nivel).filter(Boolean))];
  if (niveles.length === 1 && miembros.every(m => m.nivel)) motivos.push(`Todos ${niveles[0]}`);
  else if (niveles.length) { const idx = niveles.map(n => NIVELES.indexOf(n)); if (Math.max(...idx) - Math.min(...idx) > 1) avisos.push("Niveles muy distintos: " + niveles.join(", ")); else motivos.push("Niveles " + niveles.join(" y ")); }
  const conFranjas = miembros.filter(m => (m.franjas || []).length);
  let huecos = [], sinHueco = false;
  if (conFranjas.length === miembros.length) {
    huecos = coincidencias(miembros.map(m => m.franjas));
    if (huecos.length) motivos.push("Coinciden todos: " + textoHuecos(huecos)); else { sinHueco = true; avisos.push("No hay ningún hueco en el que coincidan todos"); }
  } else avisos.push("Falta la disponibilidad de " + miembros.filter(m => !(m.franjas || []).length).map(m => m.nombre).join(", "));
  const profes = new Set(miembros.map(m => m.profesorId).filter(Boolean));
  if (profes.size === 1 && miembros.every(m => m.profesorId)) motivos.push("Misma profesora"); else if (profes.size > 1) avisos.push("Tienen profesoras distintas");
  const edades = miembros.map(m => m.edad).filter(Number.isInteger);
  if (edades.length === miembros.length) { const d = Math.max(...edades) - Math.min(...edades); (d <= 10 ? motivos : avisos).push(`Edades de ${Math.min(...edades)} a ${Math.max(...edades)}`); }
  return { puntos, compatibilidad: compatibilidad(puntos, sinHueco, conFranjas.length < miembros.length), motivos, avisos, huecos, sinHueco };
}

function combinaciones(lista, k, desde = 0, actual = [], out = []){
  if (actual.length === k) { out.push(actual.slice()); return out; }
  for (let i = desde; i < lista.length; i++) { actual.push(lista[i]); combinaciones(lista, k, i + 1, actual, out); actual.pop(); }
  return out;
}
export const claveGrupo = ids => [...ids].sort().join("-");

/**
 * Propuestas de tamaño 2, 3 o 4, de mejor a peor.
 * excluir: Set de claves (rechazadas o ya aprobadas) que no se vuelven a proponer.
 */
export function proponer(alumnos, tam, { excluir = new Set(), limite = 40 } = {}){
  const lista = alumnos.slice(0, tam === 2 ? 200 : tam === 3 ? 60 : 30);   // límite de cálculo
  const out = [];
  for (const g of combinaciones(lista, tam)) {
    const clave = claveGrupo(g.map(m => m.id));
    if (excluir.has(clave)) continue;
    const r = tam === 2 ? puntuarPareja(g[0], g[1]) : puntuarGrupo(g);
    out.push({ clave, miembros: g, ...r });
  }
  const orden = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => orden[a.compatibilidad] - orden[b.compatibilidad] || b.puntos - a.puntos).slice(0, limite);
}
