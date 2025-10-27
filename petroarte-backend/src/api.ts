const API_URL = "http://localhost:4000/api"; 

// 🔹 Obtener lista de empleados
export async function getEmpleados() {
  const res = await fetch(`${API_URL}/empleados`);
  if (!res.ok) throw new Error("Error al obtener empleados");
  return res.json();
}

// 🔹 Agregar nuevo empleado
export async function createEmpleado(data: any) {
  const res = await fetch(`${API_URL}/empleados`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear empleado");
  return res.json();
}

// 🔹 Actualizar empleado
export async function updateEmpleado(id: string, data: any) {
  const res = await fetch(`${API_URL}/empleados/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar empleado");
  return res.json();
}

// 🔹 Eliminar empleado
export async function deleteEmpleado(id: string) {
  const res = await fetch(`${API_URL}/empleados/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar empleado");
  return res.json();
}

// 🔹 Obtener préstamos
export async function getPrestamos() {
  const res = await fetch(`${API_URL}/prestamos`);
  if (!res.ok) throw new Error("Error al obtener préstamos");
  return res.json();
}

// 🔹 Crear préstamo
export async function createPrestamo(data: any) {
  const res = await fetch(`${API_URL}/prestamos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear préstamo");
  return res.json();
}

// 🔹 Eliminar nómina
export async function deleteNomina(id: string) {
  const res = await fetch(`${API_URL}/nominas/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar nómina");
  return res.json();
}

// 🔹 Guardar nómina (una fila individual)
export async function createNomina(data: any) {
  const res = await fetch(`${API_URL}/nominas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al guardar nómina");
  return res.json();
}

// 🔹 Obtener todas las nóminas
export async function getNominas() {
  const res = await fetch(`${API_URL}/nominas`);
  if (!res.ok) throw new Error("Error al obtener nóminas");
  return res.json();
}
// 🔹 Obtener todos los check-ins
export async function getCheckins() {
  const res = await fetch(`${API_URL}/checkins`);
  if (!res.ok) throw new Error("Error al obtener check-ins");
  return res.json();
}

// 🔹 Crear varios check-ins (por día o semana)
export async function createCheckins(registros: any[]) {
  const res = await fetch(`${API_URL}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registros }),
  });
  if (!res.ok) throw new Error("Error al guardar check-ins");
  return res.json();
}