// Mi rincón de profe · conexión con Firebase
// ------------------------------------------------------------------
// - Usa el mismo proyecto, la misma cuenta y el mismo inicio de sesión que la agenda.
// - La agenda (agendas/principal/items) SOLO SE LEE. En este archivo no hay
//   ninguna función que escriba en ella: todas las escrituras pasan por
//   refRincon(), que solo construye rutas bajo rincon/principal/.
// - No activa la caché sin conexión de Firestore, para no compartir ni borrar
//   la copia local que usa la agenda en este navegador.

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
// Configuración pública del proyecto (no es secreta: la protección está en las reglas de Firestore).
const CONFIG = {
  apiKey: "AIzaSyAYfJe6-oNb7C9jcRc0FNdx2oX3-kosGeM",
  authDomain: "agenda-sara-d399b.firebaseapp.com",
  projectId: "agenda-sara-d399b",
  storageBucket: "agenda-sara-d399b.firebasestorage.app",
  messagingSenderId: "289375730705",
  appId: "1:289375730705:web:4fce96382113d813a5c5b0"
};
const LOGIN_DOMAIN = "agenda-ele.invalid";   // el mismo que usa la agenda

export const COLECCIONES = ["config", "academias", "tarifas", "profesores", "alumnos", "alias", "disponibilidad", "grupos", "propuestas",
  "asignaciones", "packs", "ajustesPack", "registrosClase", "evaluaciones", "observaciones", "incidencias", "historial"];

let F = null;          // módulos de Firebase cargados
let auth = null, db = null;
let subs = [];

export async function iniciar(){
  const [app, au, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  F = { ...app, ...au, ...fs };
  const fbApp = F.getApps().length ? F.getApp() : F.initializeApp(CONFIG);
  auth = F.getAuth(fbApp);
  db = F.initializeFirestore(fbApp, {});     // sin caché persistente
}

export function alCambiarSesion(cb){ return F.onAuthStateChanged(auth, cb); }

export async function entrar(usuario, clave){
  await F.setPersistence(auth, F.browserLocalPersistence);
  return F.signInWithEmailAndPassword(auth, usuario.trim().toLowerCase() + "@" + LOGIN_DOMAIN, clave);
}
export async function salir(){ parar(); await F.signOut(auth); }

/* ---------- lectura en tiempo real ---------- */

/** Escucha la agenda. SOLO LECTURA. */
export function escucharAgenda(onDatos, onError){
  const col = F.collection(db, "agendas", "principal", "items");
  subs.push(F.onSnapshot(col, snap => onDatos(snap.docs.map(d => ({ ...d.data(), id: d.id }))), onError));
}

/** Escucha todas las colecciones de Mi rincón de profe. */
export function escucharRincon(onColeccion, onError){
  for (const nombre of COLECCIONES) {
    const col = F.collection(db, "rincon", "principal", nombre);
    subs.push(F.onSnapshot(col, snap => onColeccion(nombre, snap.docs.map(d => ({ ...d.data(), id: d.id }))), e => onError(nombre, e)));
  }
}
export function parar(){ subs.forEach(u => u()); subs = []; }

/* ---------- escritura: solo en rincon/principal ---------- */

function refRincon(coleccion, id){
  if (!COLECCIONES.includes(coleccion)) throw new Error("Colección desconocida: " + coleccion);
  return id ? F.doc(db, "rincon", "principal", coleccion, id) : F.doc(F.collection(db, "rincon", "principal", coleccion));
}
const limpio = o => JSON.parse(JSON.stringify(o));
export const nuevoId = (coleccion, prefijo) => prefijo + "_" + refRincon(coleccion).id;

/**
 * Guarda varios cambios de una vez (todos o ninguno) y deja constancia en el historial.
 * cambios: [{ coleccion, id, datos }]  · datos = null para borrar
 */
export async function guardar(cambios, motivo = ""){
  const b = F.writeBatch(db);
  for (const c of cambios) {
    if (c.coleccion === "historial") throw new Error("El historial no se escribe directamente");
    const ref = refRincon(c.coleccion, c.id);
    if (c.datos === null) b.delete(ref);
    else b.set(ref, limpio({ ...c.datos, actualizadoEn: Date.now() }));
    b.set(refRincon("historial"), limpio({ entidad: c.coleccion, entidadId: c.id, accion: c.datos === null ? "borrar" : (c.nuevo ? "crear" : "editar"),
      cambios: c.resumen || null, motivo, fecha: Date.now() }));
  }
  await b.commit();
}

export const esPermisoDenegado = e => e && e.code === "permission-denied";
