// Agenda de ejemplo para el modo demostración (rincon.html?demo).
// Nombres y clases inventados. No se conecta a Firebase.
const pad = n => String(n).padStart(2, "0");
const key = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export function agendaDemo(hoy = new Date()){
  const items = [{ id: "settings-tipos", kind: "settings", types: [
    { id: "clase", label: "Clase en grupo", color: "#3d5bd9", lective: true },
    { id: "particular", label: "Clase particular", color: "#12968e", lective: true },
    { id: "ty_irene", label: "Clases (Irene)", color: "#7b2d3b", lective: true },
    { id: "ty_lsi", label: "Clases (LSI)", color: "#626833", lective: true },
    { id: "prep", label: "Preparación", color: "#c98a12", lective: false }
  ] }];
  // [día de la semana (0 = lunes), hora, fin, título, tipo]
  const semana = [
    [0, "09:00", "10:00", "Claire Dubois", "ty_lsi"], [0, "17:00", "18:00", "Ana Lindqvist", "ty_irene"],
    [1, "11:30", "12:30", "Workshop Nora y Ben", "ty_irene"], [1, "18:15", "19:00", "Ahmed", "ty_lsi"],
    [2, "10:00", "11:00", "Yuki Tanaka", "ty_irene"], [2, "16:00", "17:00", "Jon Arrieta", "ty_lsi"],
    [3, "09:00", "10:00", "Claire Dubois", "ty_lsi"], [3, "18:00", "19:00", "Workshop Tom y Lea", "ty_irene"],
    [4, "12:00", "13:00", "Emma Rossi", "ty_lsi"], [4, "17:00", "18:00", "Hanna", "particular"]
  ];
  let n = 0;
  const lunes0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  for (let w = -20; w <= 2; w++) {
    for (const [dia, start, end, title, type] of semana) {
      const d = new Date(lunes0); d.setDate(d.getDate() + w * 7 + dia);
      if (w < -8 && /Nora|Tom|Yuki/.test(title)) continue;   // alumnos que empezaron más tarde
      items.push({ id: "demo" + (++n), kind: "event", date: key(d), start, end, title, type, level: "", place: "", notes: "", createdAt: 0 });
    }
  }
  items.push({ id: "demo-x", kind: "event", date: key(hoy), start: "08:00", end: "08:45", title: "Sofi", type: "ty_irene", createdAt: 0 });
  items.push({ id: "demo-t", kind: "todo", date: key(hoy), text: "Corregir redacciones", done: false });
  return items;
}
