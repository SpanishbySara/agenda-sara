// Pruebas del matching de parejas y grupos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { puntuarPareja, puntuarGrupo, proponer, coincidencias, claveGrupo } from "../matching.js";

const al = (id, o = {}) => ({ id, nombre: id, nivel: "A2", edad: 30, franjas: [{ dia: 3, inicio: "18:00", fin: "20:00" }], profesorId: "blanca", texto: "", ...o });

test("huecos comunes entre disponibilidades", () => {
  assert.deepEqual(coincidencias([[{ dia: 3, inicio: "17:00", fin: "19:30" }], [{ dia: 3, inicio: "18:00", fin: "21:00" }, { dia: 4, inicio: "10:00", fin: "11:00" }]]),
    [{ dia: 3, inicio: "18:00", fin: "19:30" }]);
  assert.deepEqual(coincidencias([[{ dia: 1, inicio: "10:00", fin: "11:00" }], [{ dia: 2, inicio: "10:00", fin: "11:00" }]]), []);
});

test("pareja ideal: mismo nivel, coinciden, edades parecidas, misma profesora → alta", () => {
  const r = puntuarPareja(al("ana"), al("eva", { edad: 34 }));
  assert.equal(r.compatibilidad, "alta");
  assert.equal(r.puntos, 90);
  assert.ok(r.motivos.some(m => m.startsWith("Coinciden: miércoles 18:00–20:00")));
});

test("si no coinciden en ningún hueco, siempre baja", () => {
  const r = puntuarPareja(al("ana"), al("eva", { franjas: [{ dia: 1, inicio: "09:00", fin: "10:00" }] }));
  assert.equal(r.compatibilidad, "baja");
  assert.ok(r.avisos.includes("No coinciden en ningún hueco de su disponibilidad"));
});

test("sin disponibilidad de uno: se puede proponer, con aviso", () => {
  const r = puntuarPareja(al("ana"), al("eva", { franjas: [] }));
  assert.equal(r.compatibilidad, "media");
  assert.ok(r.avisos.some(a => a.includes("Falta la disponibilidad de eva")));
});

test("aficiones y objetivos en común suman", () => {
  const a = puntuarPareja(al("ana", { texto: "Senderismo y cine; preparar el DELE" }), al("eva", { texto: "cine coreano, dele" }));
  assert.ok(a.motivos.some(m => m.startsWith("En común:")));
  assert.equal(a.puntos, 100);
});

test("grupo de 3: huecos comunes a todos y niveles", () => {
  const g = puntuarGrupo([al("a"), al("b"), al("c", { nivel: "B1" })]);
  assert.ok(g.motivos.some(m => m.startsWith("Coinciden todos")));
  assert.ok(g.motivos.includes("Niveles A2 y B1"));
});

test("proponer ordena por compatibilidad y no repite lo rechazado", () => {
  const alumnos = [al("a"), al("b"), al("c", { nivel: "B1", franjas: [{ dia: 1, inicio: "09:00", fin: "10:00" }] })];
  const p = proponer(alumnos, 2);
  assert.equal(p[0].clave, claveGrupo(["a", "b"]));
  assert.equal(p[p.length - 1].compatibilidad, "baja");
  const sin = proponer(alumnos, 2, { excluir: new Set([claveGrupo(["b", "a"])]) });
  assert.ok(!sin.some(x => x.clave === "a-b"));
});
