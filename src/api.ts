const API_BASE = "https://petroarte-backend-1.onrender.com/api";

export type Estatus = "Activo" | "Baja";
export type TipoPago = "Por horas" | "Semanal fijo";

export type Employee = {
  _id: string;
  nombre: string;
  puesto: string;
  area: string;
  estatus: Estatus;
  tarifa: number;
  extraX: number;
  tipoPago: TipoPago;
  pagoSemanal: number;
};

export type EmployeePayload = Omit<Employee, "_id">;

type PrestamoDTO = {
  _id: string;
  empleadoId: string;
  monto: number;
  descripcion?: string;
  fechaISO?: string;
  createdAt?: string;
};

export type Prestamo = {
  _id: string;
  empleadoId: string;
  monto: number;
  descripcion: string;
  fechaISO: string;
};

export type PrestamoPayload = {
  empleadoId: string;
  monto: number;
  descripcion?: string;
};

export type NominaEmpleado = {
  nombre: string;
  total_horas: number;
  horas_primarias: number;
  horas_extras: number;
  pago_semanal_base: number;
  costo_hora_primaria: number;
  total_horas_primarias: number;
  pago_horas_primarias: number;
  costo_hora_extra: number;
  pago_horas_extras: number;
  pago_semanal_calc: number;
  descuentos: number;
  pendiente_descuento: number;
  total: number;
  bono_semanal: number;
  total_2: number;
  bono_mensual: number;
  comision: number;
  comisiones?: number;
  total_con_bono_mensual: number;
  total_con_comision: number;
  extra?: string | null;
  total_final: number;
  [key: string]: unknown;
};

export type NominaPayload = {
  semana: string;
  empleados: NominaEmpleado[];
  totalGeneral: number;
};

export type Nomina = NominaPayload & {
  _id: string;
  createdAt?: string;
  fechaRegistro?: string;
};

export type CheckinPayload = {
  nombre: string;
  dia: string;
  horaEntrada: string;
  horaSalida: string;
  horasTotales: number;
  semana: string;
};

export type Checkin = CheckinPayload & {
  _id: string;
  empleadoId?: string;
  fecha?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CloseCheckinWeekResponse = {
  message: string;
  semana: string;
  totalRegistros: number;
  totalEmpleados: number;
  empleados: Array<{
    nombre: string;
    horasTotales: number;
    registros: number;
  }>;
};

async function handleJSON<T>(responsePromise: Promise<Response>): Promise<T> {
  const res = await responsePromise;
  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data === "object" && "error" in data) {
      return String((data as { error: unknown }).error);
    }
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed: ${res.status} ${res.statusText}`;
}

function mapPrestamo(dto: PrestamoDTO): Prestamo {
  return {
    _id: dto._id,
    empleadoId: dto.empleadoId,
    monto: dto.monto,
    descripcion: dto.descripcion ?? "",
    fechaISO: dto.fechaISO ?? dto.createdAt ?? new Date().toISOString(),
  };
}

export async function getEmpleados(): Promise<Employee[]> {
  return handleJSON<Employee[]>(
    fetch(`${API_BASE}/empleados`, { credentials: "include" })
  );
}

export async function createEmpleado(payload: EmployeePayload): Promise<Employee> {
  return handleJSON<Employee>(
    fetch(`${API_BASE}/empleados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    })
  );
}

export async function updateEmpleado(id: string, data: Partial<Employee>): Promise<Employee> {
  const { _id, ...rest } = data;
  return handleJSON<Employee>(
    fetch(`${API_BASE}/empleados/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rest),
      credentials: "include",
    })
  );
}

export async function deleteEmpleado(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/empleados/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message);
  }
}

export async function getPrestamos(): Promise<Prestamo[]> {
  const data = await handleJSON<PrestamoDTO[]>(
    fetch(`${API_BASE}/prestamos`, { credentials: "include" })
  );
  return data.map(mapPrestamo);
}

export async function createPrestamo(payload: PrestamoPayload): Promise<Prestamo> {
  const dto = await handleJSON<PrestamoDTO>(
    fetch(`${API_BASE}/prestamos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    })
  );
  return mapPrestamo(dto);
}

export async function deletePrestamo(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/prestamos/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message);
  }
}

export async function getNominas(): Promise<Nomina[]> {
  return handleJSON<Nomina[]>(
    fetch(`${API_BASE}/nominas`, { credentials: "include" })
  );
}

export async function createNomina(payload: NominaPayload): Promise<Nomina> {
  return handleJSON<Nomina>(
    fetch(`${API_BASE}/nominas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    })
  );
}

export async function getCheckins(): Promise<Checkin[]> {
  return handleJSON<Checkin[]>(
    fetch(`${API_BASE}/checkins`, { credentials: "include" })
  );
}

export async function closeCheckinWeek(semana: string): Promise<CloseCheckinWeekResponse> {
  const res = await fetch(`${API_BASE}/checkins/cerrar-semana`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ semana }),
    credentials: "include",
  });

  if (res.ok) {
    return res.json() as Promise<CloseCheckinWeekResponse>;
  }

  if (res.status === 404) {
    const checkins = await getCheckins();
    const filtrados = checkins.filter((c) => (c.semana || "").trim() === semana.trim());

    if (!filtrados.length) {
      const message = await safeErrorMessage(res);
      throw new Error(message);
    }

    const resumen = new Map<
      string,
      {
        horasTotales: number;
        registros: number;
      }
    >();

    filtrados.forEach((registro) => {
      const nombre = (registro.nombre || "Sin nombre").trim() || "Sin nombre";
      const current = resumen.get(nombre) ?? { horasTotales: 0, registros: 0 };
      current.horasTotales += Number(registro.horasTotales || 0);
      current.registros += 1;
      resumen.set(nombre, current);
    });

    const empleados = Array.from(resumen.entries())
      .map(([nombre, data]) => ({
        nombre,
        horasTotales: Number(data.horasTotales.toFixed(2)),
        registros: data.registros,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    return {
      message: "Semana cerrada correctamente.",
      semana,
      totalRegistros: filtrados.length,
      totalEmpleados: empleados.length,
      empleados,
    };
  }

  const message = await safeErrorMessage(res);
  throw new Error(message);
}

export async function createCheckins(registros: CheckinPayload[]): Promise<void> {
  const res = await fetch(`${API_BASE}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registros }),
    credentials: "include",
  });
  if (!res.ok) {
    const message = await safeErrorMessage(res);
    throw new Error(message);
  }
}
