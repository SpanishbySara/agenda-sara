// La capa de datos solo puede LEER la agenda. Estas pruebas revisan el código fuente.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../datos.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");

test("la agenda solo aparece en la función de lectura", () => {
  const usos = src.match(/"agendas"/g) || [];
  assert.equal(usos.length, 1);
  const fn = src.slice(src.indexOf("export function escucharAgenda"), src.indexOf("export function escucharRincon"));
  assert.ok(fn.includes('"agendas"'));
  assert.ok(!/setDoc|updateDoc|deleteDoc|addDoc|writeBatch|\.set\(|\.delete\(/.test(fn), "la lectura de la agenda no escribe");
});

test("todas las escrituras pasan por refRincon (rincon/principal)", () => {
  const ref = src.slice(src.indexOf("function refRincon"), src.indexOf("const limpio"));
  assert.ok(ref.includes('"rincon", "principal"'));
  assert.ok(!ref.includes("agendas"));
  for (const m of src.matchAll(/\bb\.(set|delete)\(([^,)]+)/g)) assert.match(m[2], /^(ref|refRincon\()/, "escritura fuera de refRincon: " + m[0]);
  assert.ok(!/setDoc|updateDoc|deleteDoc|addDoc/.test(src), "no hay escrituras sueltas");
});

test("no activa ni borra la caché local que usa la agenda", () => {
  assert.ok(!/persistentLocalCache|clearIndexedDbPersistence|enableIndexedDbPersistence/.test(src));
});
