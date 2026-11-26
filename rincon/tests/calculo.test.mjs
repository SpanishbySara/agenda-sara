// Pruebas del motor de cálculo. Ejecutar con:  node --test rincon/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calcular, factura, parseClass, nameKey, aliasId } from "../calculo.js";

const IRENE = "spanish-with-irene", LSI = "lsi-karmele";
const AHORA = new Date(2026, 10, 26, 12, 0);   // 26 nov 2026, 12:00

const ACADEMIAS = [
  { id: IRENE, tiposAgenda: ["ty_irene"] },
  { id: LSI, tiposAgenda: ["ty_lsi"] }
];
const TARIFAS = [
  { id: "irene-2026", academiaId: IRENE, tipo: "por_clase_escalonada", vigenteDesde: "2026-01-01",
    tramos: [{ desdeClase: 1, hastaClase: 12, individual: 17, pareja: 21 }, { desdeClase: 13, hastaClase: null, individual: 19, pareja: 23 }] },
  { id: "lsi-suelta-2026", academiaId: LSI, tipo: "por_clase_duracion", vigenteDesde: "2026-01-01",
    precios: [{ minutos: 45, precio: 15 }, { minutos: 60, precio: 19 }] }
];

let n = 0;
const ev = (date, title, type = "ty_irene", start = "10:00", end = "11:00", extra = {}) =>
  Object.assign({ id: "e" + (++n), kind: "event", date, start, end, title, type }, extra);

/** Monta los datos como los entregaría Firebase. */
function datos({ items = [], alumnos = [], alias = {}, grupos = {}, packs = [], ajustes = [], registros = {}, config } = {}){
  const aliasMap = new Map();
  for (const [ac, nombre, destino] of Object.values(alias)) aliasMap.set(aliasId(ac, nombre), destino);
  return {
    items, academias: ACADEMIAS, alumnos, packs, ajustesPack: ajustes, tarifas: TARIFAS, config,
    alias: aliasMap, grupos: new Map(Object.entries(grupos)), registros: new Map(Object.entries(registros))
  };
}
const al = (id, nombre, academiaId = IRENE, extra = {}) => Object.assign({ id, nombre, academiaId, modoPago: "pack" }, extra);
const pack = (id, alumnoId, clasesContratadas, fechaCompra, extra = {}) => Object.assign({ id, alumnoId, clasesContratadas, fechaCompra, nombre: "Pack " + clasesContratadas }, extra);
const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === "object" && deepFreeze(v)); return Object.freeze(o); };

/* ------------------------------------------------------------------ */

test("parseClass y nameKey son idénticos a los de la agenda (index.html)", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  const src = html.slice(html.indexOf("const nameKey ="), html.indexOf("let studentScope"));
  const agenda = new Function(src + "; return { nameKey, parseClass };")();
  const titulos = ["Ana", "Ana García", "  ana   garcía ", "Workshop Ana, Pedro y Luis", "Workshop: Ana y Eva", "workshops Tom & Lea",
    "Workshop Ana - Eva", "Workshop Juan Ignacio y Mª José", "Taller Ana y Eva", "Ana y Eva", "Workshop", "", "Inés · B2", "WORKSHOP Zoë/Íñigo"];
  for (const t of titulos) {
    assert.deepEqual(parseClass(t), agenda.parseClass(t), t);
    assert.equal(nameKey(t), agenda.nameKey(t), t);
  }
});

test("solo cuentan Clases (Irene) y Clases (LSI): particulares, ejemplos y tareas se ignoran", () => {
  const d = datos({
    alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    items: [
      ev("2026-11-02", "Ana"),
      ev("2026-11-03", "Ana", "particular"),
      ev("2026-11-04", "Ana", "ty_irene", "10:00", "11:00", { example: true }),
      { id: "t1", kind: "todo", date: "2026-11-05", text: "Ana" },
      { id: "settings-tipos", kind: "settings", types: [] }
    ]
  });
  const r = calcular(d, AHORA);
  assert.equal(r.eventos.length, 1);
  assert.equal(r.consumos.length, 1);
});

test("el cálculo nunca modifica los datos de la agenda", () => {
  const items = deepFreeze([ev("2026-11-02", "Ana"), ev("2026-11-09", "Workshop Ana y Eva")]);
  const d = datos({ items, alumnos: [al("ana", "Ana"), al("eva", "Eva")],
    alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }], e: [IRENE, "Eva", { tipo: "alumno", alumnoId: "eva" }] } });
  assert.doesNotThrow(() => { calcular(d, AHORA); factura(calcular(d, AHORA), d, IRENE, "2026-11"); });
});

test("las clases futuras se ven como previstas y no descuentan", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-11-01")],
    items: [ev("2026-11-20", "Ana"), ev("2026-11-26", "Ana", "ty_irene", "11:00", "11:59"), ev("2026-11-26", "Ana", "ty_irene", "13:00", "14:00"), ev("2026-12-01", "Ana")] });
  const r = calcular(d, AHORA).porAlumno.get("ana");
  assert.equal(r.packs[0].realizadas, 2);
  assert.equal(r.packs[0].restantes, 22);
  assert.equal(r.consumos.filter(c => c.prevista).length, 2);
});

test("nombres sin alias van a la bandeja y no descuentan", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-11-01")],
    items: [ev("2026-11-02", "Ana"), ev("2026-11-03", "Sofi"), ev("2026-11-04", "Sofi"), ev("2026-11-05", "ANA ")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("ana").packs[0].realizadas, 2, "«ANA » es la misma Ana");
  assert.equal(r.sinVincular.length, 1);
  assert.equal(r.sinVincular[0].texto, "Sofi");
  assert.equal(r.sinVincular[0].eventos.length, 2);
});

test("el mismo nombre en dos academias puede ser dos alumnos distintos", () => {
  const d = datos({ alumnos: [al("anaI", "Ana"), al("anaL", "Ana", LSI)],
    alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "anaI" }], b: [LSI, "Ana", { tipo: "alumno", alumnoId: "anaL" }] },
    items: [ev("2026-11-02", "Ana"), ev("2026-11-03", "Ana", "ty_lsi")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("anaI").consumos.length, 1);
  assert.equal(r.porAlumno.get("anaL").consumos.length, 1);
});

test("workshop: cada participante descuenta una clase de su propio pack", () => {
  const d = datos({ alumnos: [al("tom", "Tom"), al("lea", "Lea")],
    alias: { t: [IRENE, "Tom", { tipo: "alumno", alumnoId: "tom" }], l: [IRENE, "Lea", { tipo: "alumno", alumnoId: "lea" }] },
    packs: [pack("pt", "tom", 36, "2026-11-01"), pack("pl", "lea", 24, "2026-11-01")],
    items: [ev("2026-11-02", "Workshop Tom y Lea"), ev("2026-11-09", "Workshop Tom y Lea")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("tom").packs[0].realizadas, 2);
  assert.equal(r.porAlumno.get("lea").packs[0].realizadas, 2);
  assert.ok(r.consumos.every(c => c.modalidad === "pareja"));
});

test("pareja escrita sin «workshop» mediante un alias de grupo", () => {
  const d = datos({ alumnos: [al("tom", "Tom"), al("lea", "Lea")],
    alias: { g: [IRENE, "Tom y Lea", { tipo: "grupo", grupoId: "g1" }] },
    grupos: { g1: { miembros: [{ alumnoId: "tom", desde: "2026-10-01" }, { alumnoId: "lea", desde: "2026-10-01" }] } },
    items: [ev("2026-11-02", "Tom y Lea")] });
  const r = calcular(d, AHORA);
  assert.equal(r.consumos.length, 2);
  assert.ok(r.consumos.every(c => c.modalidad === "pareja"));
});

test("«Alex- Joe» sin «workshop»: fichas individuales, una clase de cada pack y factura de pareja", () => {
  const d = datos({ alumnos: [al("alex", "Alex"), al("joe", "Joe")],
    alias: { aj: [IRENE, "Alex- Joe", { tipo: "varios", alumnoIds: ["alex", "joe"] }], a: [IRENE, "Alex", { tipo: "alumno", alumnoId: "alex" }] },
    packs: [pack("pa", "alex", 24, "2026-11-01"), pack("pj", "joe", 24, "2026-11-01")],
    items: [ev("2026-11-02", "Alex- Joe"), ev("2026-11-03", "Alex")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("alex").packs[0].realizadas, 2, "Alex: la de pareja y la individual");
  assert.equal(r.porAlumno.get("joe").packs[0].realizadas, 1);
  assert.equal(r.sinVincular.length, 0);
  const f = factura(r, d, IRENE, "2026-11");
  assert.deepEqual(f.lineas.map(l => [l.concepto, l.importe]), [["Clase en pareja", 21], ["Clase individual", 17]]);
});

/* ---------- packs ---------- */

test("no descuenta clases anteriores a la compra del pack", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-11-10")],
    items: [ev("2026-11-03", "Ana"), ev("2026-11-12", "Ana")] });
  const r = calcular(d, AHORA).porAlumno.get("ana");
  assert.equal(r.packs[0].realizadas, 1);
  assert.equal(r.sinPack.length, 0, "la clase del 3 de noviembre es anterior al primer pack: no avisa");
  assert.equal(r.antesDePacks.length, 1);
});

test("una clase entre dos packs (sin clases disponibles) sí avisa como «sin pack»", () => {
  const items = Array.from({ length: 12 }, (_, i) => ev(`2026-11-${String(i + 1).padStart(2, "0")}`, "Jon", "ty_lsi"));
  const r = calcular(datos({ alumnos: [al("jon", "Jon", LSI)], alias: { j: [LSI, "Jon", { tipo: "alumno", alumnoId: "jon" }] },
    items, packs: [pack("p1", "jon", 10, "2026-11-01")] }), AHORA).porAlumno.get("jon");
  assert.equal(r.sinPack.length, 2);
  assert.ok(calcular(datos({ alumnos: [al("jon", "Jon", LSI)], alias: { j: [LSI, "Jon", { tipo: "alumno", alumnoId: "jon" }] },
    items, packs: [pack("p1", "jon", 10, "2026-11-01")] }), AHORA).avisos.some(a => a.tipo === "sin_pack"));
});

test("las clases se asignan por orden: al terminar un pack pasan al siguiente; el nuevo queda pendiente hasta entonces", () => {
  const items = [];
  for (let d = 2; d <= 13; d++) items.push(ev(`2026-11-${String(d).padStart(2, "0")}`, "Jon", "ty_lsi"));
  const base = { alumnos: [al("jon", "Jon", LSI)], alias: { j: [LSI, "Jon", { tipo: "alumno", alumnoId: "jon" }] } };
  let r = calcular(datos({ ...base, items, packs: [pack("p1", "jon", 10, "2026-11-01"), pack("p2", "jon", 10, "2026-11-05")] }), AHORA).porAlumno.get("jon");
  assert.equal(r.packs[0].realizadas, 10);
  assert.equal(r.packs[0].estado, "terminado");
  assert.equal(r.packs[1].realizadas, 2);
  assert.equal(r.packs[1].restantes, 8);
  assert.equal(r.actual.pack.id, "p2");

  r = calcular(datos({ ...base, items: items.slice(0, 4), packs: [pack("p1", "jon", 10, "2026-11-01"), pack("p2", "jon", 10, "2026-11-05")] }), AHORA).porAlumno.get("jon");
  assert.equal(r.packs[1].estado, "pendiente", "el pack renovado no empieza hasta que se acaba el anterior");
});

test("avisos de renovación: 3 restantes, 1 urgente, 0 terminado y pendiente de renovar", () => {
  const caso = hechas => {
    const items = Array.from({ length: hechas }, (_, i) => ev(`2026-11-${String(i + 1).padStart(2, "0")}`, "Emma", "ty_lsi", "09:00", "10:00"));
    return calcular(datos({ alumnos: [al("emma", "Emma", LSI)], alias: { e: [LSI, "Emma", { tipo: "alumno", alumnoId: "emma" }] },
      items, packs: [pack("p1", "emma", 10, "2026-11-01")] }), AHORA).porAlumno.get("emma");
  };
  assert.equal(caso(6).packs[0].estado, "activo");
  assert.equal(caso(7).packs[0].estado, "renovar");
  assert.equal(caso(9).packs[0].estado, "urgente");
  const fin = caso(10);
  assert.equal(fin.packs[0].estado, "terminado");
  assert.equal(fin.pendienteRenovar, true);
});

test("los umbrales de aviso se pueden configurar", () => {
  const items = Array.from({ length: 5 }, (_, i) => ev(`2026-11-0${i + 1}`, "Emma", "ty_lsi"));
  const r = calcular(datos({ alumnos: [al("emma", "Emma", LSI)], alias: { e: [LSI, "Emma", { tipo: "alumno", alumnoId: "emma" }] },
    items, packs: [pack("p1", "emma", 10, "2026-11-01")], config: { umbrales: { renovacion: 5, urgente: 2 } } }), AHORA);
  assert.equal(r.porAlumno.get("emma").packs[0].estado, "renovar");
});

test("«no renueva» quita el aviso de renovación", () => {
  const items = Array.from({ length: 10 }, (_, i) => ev(`2026-11-${String(i + 1).padStart(2, "0")}`, "Emma", "ty_lsi"));
  const r = calcular(datos({ alumnos: [al("emma", "Emma", LSI)], alias: { e: [LSI, "Emma", { tipo: "alumno", alumnoId: "emma" }] },
    items, packs: [pack("p1", "emma", 10, "2026-11-01", { noRenueva: { fecha: "2026-11-20" } })] }), AHORA);
  assert.equal(r.porAlumno.get("emma").pendienteRenovar, false);
});

test("clases ya consumidas: el saldo inicial cubre la agenda hasta su fecha y no cuenta dos veces", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-09-02", { consumidasPrevias: { clases: 15, hasta: "2026-10-31" } })],
    items: [ev("2026-10-27", "Ana"), ev("2026-10-30", "Ana"),                // ya incluidas en las 15
            ...[3, 5, 10, 12, 17, 19].map(d => ev(`2026-11-${String(d).padStart(2, "0")}`, "Ana"))] });
  const r = calcular(d, AHORA).porAlumno.get("ana");
  assert.equal(r.packs[0].realizadas, 21);
  assert.equal(r.packs[0].restantes, 3);
  assert.equal(r.packs[0].estado, "renovar");
  assert.equal(r.cubiertas.length, 2);
  assert.equal(r.sinPack.length, 0);
});

test("clases ya gastadas del pack sin fecha: se restan y todas las clases de la agenda cuentan", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-09-02", { consumidasPrevias: { clases: 15 } })],
    items: [3, 5, 10, 12, 17, 19].map(d => ev(`2026-11-${String(d).padStart(2, "0")}`, "Ana")) });
  const r = calcular(d, AHORA).porAlumno.get("ana");
  assert.equal(r.packs[0].realizadas, 21);
  assert.equal(r.packs[0].restantes, 3);
  assert.equal(r.cubiertas.length, 0);
});

test("los ajustes manuales suman o restan clases disponibles", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-11-01")], ajustes: [{ packId: "p1", cantidad: 1, motivo: "Regalo" }, { packId: "p1", cantidad: -2, motivo: "Corrección" }],
    items: [ev("2026-11-02", "Ana")] });
  assert.equal(calcular(d, AHORA).porAlumno.get("ana").packs[0].restantes, 22);
});

test("un pack anulado no consume clases", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p0", "ana", 24, "2026-10-01", { estadoManual: "anulado" }), pack("p1", "ana", 24, "2026-11-01")],
    items: [ev("2026-11-02", "Ana")] });
  const r = calcular(d, AHORA).porAlumno.get("ana");
  assert.equal(r.packs.find(p => p.pack.id === "p0").realizadas, 0);
  assert.equal(r.packs.find(p => p.pack.id === "p1").realizadas, 1);
});

test("alumno que paga por clase: sus clases son sueltas, sin avisos de pack", () => {
  const d = datos({ alumnos: [al("ahmed", "Ahmed", LSI, { modoPago: "por_clase" })], alias: { a: [LSI, "Ahmed", { tipo: "alumno", alumnoId: "ahmed" }] },
    items: [ev("2026-11-02", "Ahmed", "ty_lsi"), ev("2026-11-09", "Ahmed", "ty_lsi", "10:00", "10:45")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("ahmed").sueltas.length, 2);
  assert.equal(r.avisos.filter(a => a.tipo === "sin_pack").length, 0);
});

/* ---------- cancelaciones y recuperaciones ---------- */

test("estados: Cancelada (cuenta) descuenta, Cancelada no", () => {
  const e1 = ev("2026-11-02", "Ana"), e2 = ev("2026-11-03", "Ana"), e3 = ev("2026-11-04", "Ana");
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-11-01")], items: [e1, e2, e3],
    registros: { [e2.id]: { porAlumno: { ana: { estado: "cancelada_cuenta" } } }, [e3.id]: { porAlumno: { ana: { estado: "cancelada" } } } } });
  assert.equal(calcular(d, AHORA).porAlumno.get("ana").packs[0].realizadas, 2);
});

test("recuperación: la original y su recuperación cuentan 1 en total", () => {
  const orig = ev("2026-11-02", "Ana"), recu = ev("2026-11-05", "Ana"), otra = ev("2026-11-06", "Ana");
  const base = { alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    packs: [pack("p1", "ana", 24, "2026-11-01")], items: [orig, recu, otra] };
  // original cancelada + recuperación → 1 (más la otra clase normal)
  let r = calcular(datos({ ...base, registros: {
    [orig.id]: { porAlumno: { ana: { estado: "cancelada" } } }, [recu.id]: { porAlumno: { ana: { estado: "recuperacion", recuperaDe: orig.id } } } } }), AHORA);
  assert.equal(r.porAlumno.get("ana").packs[0].realizadas, 2);
  // original ya cobrada (cancelada cuenta) → la recuperación no descuenta
  r = calcular(datos({ ...base, registros: {
    [orig.id]: { porAlumno: { ana: { estado: "cancelada_cuenta" } } }, [recu.id]: { porAlumno: { ana: { estado: "recuperacion", recuperaDe: orig.id } } } } }), AHORA);
  assert.equal(r.porAlumno.get("ana").packs[0].realizadas, 2);
  // dos recuperaciones de la misma original → la segunda no cuenta y avisa
  r = calcular(datos({ ...base, registros: {
    [orig.id]: { porAlumno: { ana: { estado: "cancelada" } } },
    [recu.id]: { porAlumno: { ana: { estado: "recuperacion", recuperaDe: orig.id } } },
    [otra.id]: { porAlumno: { ana: { estado: "recuperacion", recuperaDe: orig.id } } } } }), AHORA);
  assert.equal(r.porAlumno.get("ana").packs[0].realizadas, 1);
  assert.ok(r.avisos.some(a => a.texto.includes("ya tiene otra recuperación")));
});

/* ---------- factura Spanish with Irene ---------- */

const irenePareja = (registro, extraAlumnos = {}) => {
  const e = ev("2026-11-10", "Workshop Tom y Lea");
  const d = datos({ alumnos: [al("tom", "Tom", IRENE, extraAlumnos.tom), al("lea", "Lea", IRENE, extraAlumnos.lea)],
    alias: { t: [IRENE, "Tom", { tipo: "alumno", alumnoId: "tom" }], l: [IRENE, "Lea", { tipo: "alumno", alumnoId: "lea" }] },
    packs: [pack("pt", "tom", 36, "2026-11-01"), pack("pl", "lea", 24, "2026-11-01")], items: [e],
    registros: registro ? { [e.id]: { porAlumno: registro } } : {} });
  const r = calcular(d, AHORA);
  return { r, f: factura(r, d, IRENE, "2026-11") };
};

test("Irene: clase individual a 17 € en las 12 primeras y a 19 € desde la 13", () => {
  const items = Array.from({ length: 14 }, (_, i) => ev(`2026-11-${String(i + 1).padStart(2, "0")}`, "Ana"));
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] }, items });
  const f = factura(calcular(d, AHORA), d, IRENE, "2026-11");
  assert.deepEqual(f.lineas.map(l => l.importe), [...Array(12).fill(17), 19, 19]);
  assert.equal(f.total, 12 * 17 + 2 * 19);
});

test("Irene: el contador de tarifa no se reinicia con un pack nuevo", () => {
  const items = Array.from({ length: 14 }, (_, i) => ev(`2026-11-${String(i + 1).padStart(2, "0")}`, "Ana"));
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] }, items,
    packs: [pack("p1", "ana", 12, "2026-11-01"), pack("p2", "ana", 24, "2026-11-01")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("ana").packs[1].realizadas, 2, "el pack nuevo empieza en 1");
  assert.deepEqual(factura(r, d, IRENE, "2026-11").lineas.slice(-2).map(l => l.importe), [19, 19], "pero se cobra a 19 €");
});

test("Irene: clases anteriores sin fecha → se suman antes de la primera clase de la agenda, aunque se vinculen nombres después", () => {
  const items = [ev("2026-11-02", "Alex- Joe"), ev("2026-11-04", "Alex")];
  for (let d = 5; d <= 15; d++) items.push(ev(`2026-11-${String(d).padStart(2, "0")}`, "Alex"));
  const d = datos({ alumnos: [al("alex", "Alex", IRENE, { clasesPreviasTarifa: { clases: 10 } }), al("joe", "Joe")],
    alias: { a: [IRENE, "Alex", { tipo: "alumno", alumnoId: "alex" }], aj: [IRENE, "Alex- Joe", { tipo: "varios", alumnoIds: ["alex", "joe"] }] }, items });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("alex").totalTarifa, 10 + 13);
  assert.deepEqual(r.porAlumno.get("alex").consumos.map(c => c.ordinalTarifa).slice(0, 4), [11, 12, 13, 14]);
  const f = factura(r, d, IRENE, "2026-11");
  assert.equal(f.lineas[0].importe, 21, "la pareja del 2 nov es la clase 11 de Alex");
  assert.equal(f.lineas[2].importe, 19, "la del 5 nov es la 13.ª");
});

test("Irene: las clases previas a la agenda cuentan para el tramo", () => {
  const d = datos({ alumnos: [al("ana", "Ana", IRENE, { clasesPreviasTarifa: { clases: 30, hasta: "2026-10-31" } })],
    alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] }, items: [ev("2026-11-02", "Ana")] });
  assert.equal(factura(calcular(d, AHORA), d, IRENE, "2026-11").lineas[0].importe, 19);
});

test("Irene: workshop con los dos → una sola línea de pareja a 21 €", () => {
  const { r, f } = irenePareja(null);
  assert.equal(f.lineas.length, 1);
  assert.equal(f.lineas[0].importe, 21);
  assert.equal(r.porAlumno.get("tom").packs[0].realizadas, 1);
  assert.equal(r.porAlumno.get("lea").packs[0].realizadas, 1);
});

test("Irene: en pareja, si uno ya pasó de 12 clases se cobran 23 €", () => {
  const { f } = irenePareja(null, { tom: { clasesPreviasTarifa: { clases: 30, hasta: "2026-10-31" } } });
  assert.equal(f.lineas[0].importe, 23);
});

test("Irene: si uno cancela sin aviso a tiempo (Cancelada cuenta) → pareja y los dos descuentan", () => {
  const { r, f } = irenePareja({ lea: { estado: "cancelada_cuenta" } });
  assert.equal(f.lineas[0].importe, 21);
  assert.equal(r.porAlumno.get("lea").packs[0].realizadas, 1);
});

test("Irene: si uno cancela por algo urgente (Cancelada) → individual del que vino y el otro no descuenta", () => {
  const { r, f } = irenePareja({ lea: { estado: "cancelada" } });
  assert.equal(f.lineas.length, 1);
  assert.equal(f.lineas[0].concepto, "Clase individual");
  assert.equal(f.lineas[0].importe, 17);
  assert.equal(r.porAlumno.get("tom").packs[0].realizadas, 1);
  assert.equal(r.porAlumno.get("lea").packs[0].realizadas, 0);
});

test("Irene: si cancelan los dos (Cancelada) no se factura nada", () => {
  const { f } = irenePareja({ tom: { estado: "cancelada" }, lea: { estado: "cancelada" } });
  assert.equal(f.lineas.length, 0);
});

test("Irene: solo se facturan las clases del mes pedido", () => {
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    items: [ev("2026-10-30", "Ana"), ev("2026-11-02", "Ana")] });
  const r = calcular(d, AHORA);
  assert.equal(factura(r, d, IRENE, "2026-11").lineas.length, 1);
  assert.equal(factura(r, d, IRENE, "2026-10").lineas.length, 1);
});

/* ---------- factura LSI ---------- */

test("LSI: los packs se facturan enteros en el mes de compra y sus clases no se vuelven a cobrar", () => {
  const d = datos({ alumnos: [al("marta", "Marta", LSI), al("claire", "Claire", LSI)],
    alias: { m: [LSI, "Marta", { tipo: "alumno", alumnoId: "marta" }], c: [LSI, "Claire", { tipo: "alumno", alumnoId: "claire" }] },
    packs: [pack("p1", "marta", 10, "2026-11-03", { nombre: "Pack adultos", precio: { importe: 180, moneda: "EUR" } }),
            pack("p2", "claire", 10, "2026-10-20", { nombre: "Pack apoyo", precio: { importe: 190, moneda: "EUR" } })],
    items: [ev("2026-11-04", "Marta", "ty_lsi"), ev("2026-11-05", "Claire", "ty_lsi")] });
  const r = calcular(d, AHORA);
  const nov = factura(r, d, LSI, "2026-11"), oct = factura(r, d, LSI, "2026-10");
  assert.deepEqual(nov.lineas.map(l => l.importe), [180]);
  assert.deepEqual(oct.lineas.map(l => l.importe), [190]);
});

test("LSI: un pack con fecha de compra desconocida no se factura", () => {
  const d = datos({ alumnos: [al("marta", "Marta", LSI)], alias: { m: [LSI, "Marta", { tipo: "alumno", alumnoId: "marta" }] },
    packs: [pack("p1", "marta", 10, "2026-11-04", { fechaCompraDesconocida: true, precio: { importe: 180 } })], items: [ev("2026-11-04", "Marta", "ty_lsi")] });
  const r = calcular(d, AHORA);
  assert.equal(r.porAlumno.get("marta").packs[0].realizadas, 1);
  assert.equal(factura(r, d, LSI, "2026-11").lineas.length, 0);
  // aunque luego aparezcan clases anteriores a la fecha guardada, cuentan en ese pack
  const d2 = datos({ ...{}, alumnos: d.alumnos, packs: d.packs, items: [ev("2026-10-20", "Marta", "ty_lsi"), ev("2026-11-04", "Marta", "ty_lsi")],
    alias: { m: [LSI, "Marta", { tipo: "alumno", alumnoId: "marta" }] } });
  assert.equal(calcular(d2, AHORA).porAlumno.get("marta").packs[0].realizadas, 2);
});

test("LSI: clases sueltas a 19 € (60 min) y 15 € (45 min); otra duración avisa", () => {
  const d = datos({ alumnos: [al("ahmed", "Ahmed", LSI, { modoPago: "por_clase" })], alias: { a: [LSI, "Ahmed", { tipo: "alumno", alumnoId: "ahmed" }] },
    items: [ev("2026-11-02", "Ahmed", "ty_lsi", "10:00", "11:00"), ev("2026-11-03", "Ahmed", "ty_lsi", "10:00", "10:45"), ev("2026-11-04", "Ahmed", "ty_lsi", "10:00", "11:30")] });
  const f = factura(calcular(d, AHORA), d, LSI, "2026-11");
  assert.deepEqual(f.lineas.map(l => l.importe), [19, 15]);
  assert.equal(f.total, 34);
  assert.equal(f.avisos.length, 1);
});

/* ---------- avisos ---------- */

test("avisa de registros huérfanos y de posibles clases duplicadas", () => {
  const e1 = ev("2026-11-02", "Ana", "ty_irene", "10:00", "11:00"), e2 = ev("2026-11-02", "Ana", "ty_irene", "10:30", "11:30");
  const d = datos({ alumnos: [al("ana", "Ana")], alias: { a: [IRENE, "Ana", { tipo: "alumno", alumnoId: "ana" }] },
    items: [e1, e2], registros: { e_borrado: { porAlumno: {} } } });
  const r = calcular(d, AHORA);
  assert.ok(r.avisos.some(a => a.tipo === "huerfano"));
  assert.ok(r.avisos.some(a => a.tipo === "duplicado"));
});
