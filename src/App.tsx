import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getPrestamos,
  createPrestamo,
  deletePrestamo,
  createNomina,
  updateNomina,
  deleteNominasBySemana,
  getNominas,
  createCheckins,
  getCheckins,
  closeCheckinWeek,
} from "./api";
import type {
  Employee,
  EmployeePayload,
  Estatus,
  TipoPago,
  Prestamo,
  PrestamoPayload,
  NominaPayload,
  NominaEmpleado,
  Checkin,
  CloseCheckinWeekResponse,
} from "./api";

type Row = Record<string, any>;
type Section = "nominas" | "empleados" | "checkin" | "billetes";
type NominaRegistro = NominaEmpleado & {
  _id?: string;
  semana?: string;
  fechaRegistro?: string;
  createdAt?: string;
  updatedAt?: string;
  totalGeneral?: number;
};
type NominaSemana = {
  semana: string;
  empleados: NominaEmpleado[];
  totalGeneral: number;
  createdAt?: string;
  fechaRegistro?: string;
};

type EditableNominaRow = {
  _id?: string;
  nombre: string;
  pago_semanal_calc: string;
  bono_semanal: string;
  bono_mensual: string;
  comision: string;
  descuentos: string;
  pendiente_descuento: string;
  total_final: string;
};

type ManualBonusFlags = {
  semanal: boolean;
  mensual: boolean;
};

type SectionNavItem = {
  key: Section;
  label: string;
  description: string;
  icon: string;
};

type SectionGuideStep = {
  badge: string;
  label: string;
  detail: string;
};

type SectionGuideInfo = {
  title: string;
  subtitle: string;
  helper: string;
  steps: SectionGuideStep[];
};

type AlertVariant = "info" | "success" | "warning" | "error";
type ModalAlert = {
  message: string;
  variant: AlertVariant;
};

const ALERT_STYLES: Record<
  AlertVariant,
  { icon: string; accent: string; button: string; badge: string; label: string }
> = {
  info: {
    icon: "ℹ️",
    accent: "text-sky-700",
    button: "bg-sky-600 hover:bg-sky-700 focus-visible:ring-sky-400",
    badge: "bg-sky-100 text-sky-700",
    label: "Aviso",
  },
  success: {
    icon: "✅",
    accent: "text-emerald-700",
    button: "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Listo",
  },
  warning: {
    icon: "⚠️",
    accent: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-400",
    badge: "bg-amber-100 text-amber-700",
    label: "Atención",
  },
  error: {
    icon: "❌",
    accent: "text-rose-700",
    button: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400",
    badge: "bg-rose-100 text-rose-700",
    label: "Ups…",
  },
};

const SECTION_NAV_ITEMS: SectionNavItem[] = [
  {
    key: "nominas",
    label: "Nóminas",
    description: "Filtra, ajusta y exporta pagos.",
    icon: "🧾",
  },
  {
    key: "checkin",
    label: "Check-in",
    description: "Horas por día al instante.",
    icon: "⏱️",
  },
  {
    key: "empleados",
    label: "Equipo",
    description: "Perfiles, extras y préstamos.",
    icon: "👥",
  },
  {
    key: "billetes",
    label: "Billetes",
    description: "Entregas en efectivo controladas.",
    icon: "💵",
  },
];

const SECTION_GUIDES: Record<Section, SectionGuideInfo> = {
  nominas: {
    title: "Nóminas listas en minutos",
    subtitle: "Filtra, revisa y exporta con total claridad.",
    helper:
      "Tip: usa la semana mostrada en el historial para mantener sincronía con check-in y descuentos.",
    steps: [
      {
        badge: "Paso 1",
        label: "Enfoca la semana correcta",
        detail: "Busca por nombre o elige periodo para depurar la tabla antes de editar.",
      },
      {
        badge: "Paso 2",
        label: "Confirma columnas clave",
        detail: "Selecciona las columnas de nombre y monto sugeridas automáticamente.",
      },
      {
        badge: "Paso 3",
        label: "Exporta o edita",
        detail: "Abre el historial, lanza el editor o exporta a CSV cuando estés conforme.",
      },
    ],
  },
  checkin: {
    title: "Check-in sin estrés",
    subtitle: "Captura entradas/salidas y genera el resumen semanal.",
    helper: "Consejo: guarda cada día apenas termines para evitar retrabajos.",
    steps: [
      {
        badge: "Paso 1",
        label: "Define la semana",
        detail: "Escribe el identificador y activa los días que vas a capturar.",
      },
      {
        badge: "Paso 2",
        label: "Carga nombres y horarios",
        detail: "Usa la lista de empleados y las alertas visuales para validar entradas.",
      },
      {
        badge: "Paso 3",
        label: "Guarda y cierra",
        detail: "Registra cada día y cierra la semana cuando esté completa para exportar a nómina.",
      },
    ],
  },
  empleados: {
    title: "Control total del equipo",
    subtitle: "Consulta, actualiza y otorga extras desde un solo lugar.",
    helper: "Tip: abre los datos extra para mantener dirección, RFC y préstamos al día.",
    steps: [
      {
        badge: "Paso 1",
        label: "Ubica al colaborador",
        detail: "Filtra por nombre o estado para entender su situación actual.",
      },
      {
        badge: "Paso 2",
        label: "Actualiza datos clave",
        detail: "Edita tipo de pago, bonos y campos fiscales sin perder contexto.",
      },
      {
        badge: "Paso 3",
        label: "Gestiona extras",
        detail: "Crea o liquida préstamos y bonificaciones desde el mismo panel.",
      },
    ],
  },
  billetes: {
    title: "Entrega de efectivo impecable",
    subtitle: "Arma paquetes de billetes y deja un rastro claro.",
    helper: "Consejo: guarda una nota corta cada vez para recordar el propósito de la entrega.",
    steps: [
      {
        badge: "Paso 1",
        label: "Elige la mezcla",
        detail: "Ajusta las cantidades de cada denominación y verifica el total.",
      },
      {
        badge: "Paso 2",
        label: "Agrega contexto",
        detail: "Escribe una nota breve para saber quién recibió y por qué.",
      },
      {
        badge: "Paso 3",
        label: "Registra y exporta",
        detail: "Guarda la entrega y descarga el CSV cuando necesites compartirlo.",
      },
    ],
  },
};

/* ───── Utilidades ─────────────────────────────────────────────── */
function toCSV(rows: Row[]): string {
  if (!rows?.length) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replaceAll('"', '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.join(",");
  const lines = rows.map((r) => cols.map((c) => escape(r[c])).join(","));
  return [header, ...lines].join("\n");
}

function isNumericColumn(data: Row[], col: string): boolean {
  const vals = data
    .slice(0, 150)
    .map((r) => r[col])
    .filter((v) => v !== null && v !== undefined && v !== "");
  if (!vals.length) return false;
  return vals.every((v) => !isNaN(Number(v)));
}

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const HIDDEN_COLUMNS = new Set(["__v", "_id", "createdAt", "updatedAt", "fechaRegistro"]);

/** Parse HH:MM o legacy 8,50 */
function parseTimeToHours(input: string): number | null {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh + mm / 60;
    return null;
  }
  if (/^\d{1,2},\d{1,2}$/.test(s)) return Number(s.replace(",", "."));
  if (/^\d{1,2}(\.\d+)?$/.test(s)) return Number(s);
  return null;
}
function spanHours(start: string, end: string): number {
  const a = parseTimeToHours(start);
  const b = parseTimeToHours(end);
  if (a === null || b === null) return 0;
  const d = b - a;
  return d > 0 ? d : 0;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      const parsed = safeNumber(value);
      if (parsed !== 0 || value === 0 || value === "0") return parsed;
    }
  }
  return 0;
}

function extraerComision(registro: NominaRegistro): number {
  const asRecord = registro as Record<string, unknown>;
  const raw = asRecord.comision ?? asRecord.comisiones ?? 0;
  return safeNumber(raw);
}

function agruparNominasPorSemana(registros: NominaRegistro[]): NominaSemana[] {
  const map = new Map<string, NominaSemana>();

  const getTime = (value?: string) => {
    if (!value) return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  };

  registros.forEach((registro) => {
    const semana = registro.semana?.trim() || "Sin semana";
    const {
      _id: _omitId,
      createdAt,
      updatedAt,
      fechaRegistro,
      totalGeneral: totalGeneralRegistro,
      empleados: _empleadosNested,
      ...resto
    } = registro;

    const empleado = resto as NominaEmpleado;
    const totalEmpleado = pickNumber(
      (empleado as Partial<NominaEmpleado>).total_final,
      (empleado as Partial<NominaEmpleado>).total,
      totalGeneralRegistro
    );

    const existente = map.get(semana);
    if (existente) {
      existente.empleados.push(empleado);
      existente.totalGeneral += totalEmpleado;

      const existenteTime = getTime(existente.createdAt);
      const createdTime = getTime(createdAt);
      if (createdTime > existenteTime) {
        existente.createdAt = createdAt;
      }
      if (!existente.fechaRegistro && fechaRegistro) {
        existente.fechaRegistro = fechaRegistro;
      }
    } else {
      map.set(semana, {
        semana,
        empleados: [empleado],
        totalGeneral: totalEmpleado,
        createdAt: createdAt ?? updatedAt ?? fechaRegistro,
        fechaRegistro,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = Date.parse(a.createdAt ?? "") || 0;
    const bTime = Date.parse(b.createdAt ?? "") || 0;
    if (bTime === aTime) {
      return b.semana.localeCompare(a.semana);
    }
    return bTime - aTime;
  });
}

/** Tema oscuro con persistencia */
function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);
  return { dark, setDark };
}

/* ───── App ────────────────────────────────────────────────────── */
export default function App() {
  const { dark, setDark } = useTheme();
  const [section, setSection] = useState<Section>("nominas");
  const navItems = SECTION_NAV_ITEMS;
  const sectionGuide = SECTION_GUIDES[section];

  // Título de semana (solo debajo de la tabla de nóminas)
  const [sectionTitle, setSectionTitle] = useState<string>("");
  const [showTopTotales, setShowTopTotales] = useState(false);
  const [showNominasTable, setShowNominasTable] = useState(false);
  const [modalAlert, setModalAlert] = useState<ModalAlert | null>(null);

  // Datos nómina
  const [rawData, setRawData] = useState<Row[]>([]);
  const [nominasGuardadas, setNominasGuardadas] = useState<NominaSemana[]>([]);
  const [detalleNomina, setDetalleNomina] = useState<NominaSemana | null>(null);
  const [editNominaSemana, setEditNominaSemana] = useState<string | null>(null);
  const [editNominaOriginal, setEditNominaOriginal] = useState<NominaRegistro[]>([]);
  const [editNominaRows, setEditNominaRows] = useState<EditableNominaRow[]>([]);
  const [editNominaSaving, setEditNominaSaving] = useState(false);
  const [deleteNominaLoading, setDeleteNominaLoading] = useState(false);
  const [deleteSemanaTarget, setDeleteSemanaTarget] = useState<string | null>(null);
  const [semanaCheckin, setSemanaCheckin] = useState<string>("");
  const [semanaNomina, setSemanaNomina] = useState<string>("");
  const [semanaNominaTouched, setSemanaNominaTouched] = useState(false);
  const [empleados, setEmpleados] = useState<Employee[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const empleadosNombres = useMemo(() => {
    const set = new Set<string>();
    empleados.forEach((emp) => {
      const nombre = String(emp.nombre ?? "").trim();
      if (nombre) set.add(nombre);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [empleados]);
  const [extraEmpleado, setExtraEmpleado] = useState<Employee | null>(null);
  const [extraForm, setExtraForm] = useState({
    direccion: "",
    telefono: "",
    rfc: "",
    curp: "",
  });
  const showAlert = useCallback(
    (message: string, variant: AlertVariant = "info") => {
      setModalAlert({ message, variant });
    },
    []
  );
  const closeAlert = useCallback(() => setModalAlert(null), []);

  useEffect(() => {
    if (!modalAlert) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAlert();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalAlert, closeAlert]);
  const currentAlertStyle = modalAlert ? ALERT_STYLES[modalAlert.variant] : null;
  const refrescarNominas = useCallback(async () => {
    try {
      const data = await getNominas();
      const registros = ((Array.isArray(data) ? data : []) as unknown) as NominaRegistro[];
      setRawData(registros);
      const agrupadas = agruparNominasPorSemana(registros);
      setNominasGuardadas(agrupadas);
      if (agrupadas.length > 0) {
        setSectionTitle(agrupadas[0].semana);
      }
    } catch (err) {
      console.error("❌ Error al cargar nóminas:", err);
    }
  }, []);

  // Cargar nóminas directamente desde el backend
  useEffect(() => {
    void refrescarNominas();
  }, [refrescarNominas]);

  useEffect(() => {
    if (!sectionTitle) return;
    if (!semanaCheckin) {
      setSemanaCheckin(sectionTitle);
    }
    if (!semanaNominaTouched && sectionTitle !== semanaNomina) {
      setSemanaNomina(sectionTitle);
    }
  }, [sectionTitle, semanaCheckin, semanaNominaTouched, semanaNomina]);

  useEffect(() => {
    const cargar = async () => {
      setLoadingEmpleados(true);
      try {
        const data = await getEmpleados();
        setEmpleados(data);
      } catch (err) {
        console.error("❌ Error al cargar empleados:", err);
      } finally {
        setLoadingEmpleados(false);
      }
    };
    cargar();
  }, []);

  const abrirExtrasEmpleado = (emp: Employee) => {
    setExtraEmpleado(emp);
    setExtraForm({
      direccion: emp.direccion || "",
      telefono: emp.telefono || "",
      rfc: (emp.rfc || "").toUpperCase(),
      curp: (emp.curp || "").toUpperCase(),
    });
  };

  const cerrarExtrasEmpleado = () => {
    setExtraEmpleado(null);
  };

  // Columnas
  const columns = useMemo(() => {
    if (!rawData.length) return [];
    return Object.keys(rawData[0]).filter((col) => !HIDDEN_COLUMNS.has(col));
  }, [rawData]);
  const numericCols = useMemo(
    () => columns.filter((c) => isNumericColumn(rawData, c)),
    [columns, rawData]
  );
  const textCols = useMemo(
    () => columns.filter((c) => !numericCols.includes(c)),
    [columns, numericCols]
  );

  // Selecciones
  const [nameCol, setNameCol] = useState<string>("");
  const [amountCol, setAmountCol] = useState<string>("");
  useEffect(() => {
    if (!nameCol) {
      const guess =
        columns.find((c) => /(emplead|colaborador|nombre|persona)/i.test(c)) ||
        textCols[0];
      if (guess) setNameCol(guess);
    }
    if (!amountCol) {
      const guess =
        columns.find((c) =>
          /(importe|monto|total|neto|bruto|pago|sueldo|salario)/i.test(c)
        ) || numericCols[0];
      if (guess) setAmountCol(guess);
    }
  }, [columns, textCols, numericCols, nameCol, amountCol]);

  // Filtro global
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return rawData;
    const needle = q.toLowerCase();
    return rawData.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? "").toLowerCase().includes(needle)
      )
    );
  }, [rawData, q]);

  // Periodo
  const [periodo, setPeriodo] = useState<string>("");
  const periodoCol = useMemo(
    () => columns.find((c) => /(periodo|mes|fecha|anio|año)/i.test(c)) || "",
    [columns]
  );
  const periodosUnicos = useMemo(() => {
    if (!periodoCol) return [];
    return Array.from(new Set(filtered.map((r) => String(r[periodoCol] ?? ""))))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [filtered, periodoCol]);

  const datosPeriodo = useMemo(() => {
    if (!periodo || !periodoCol) return filtered;
    return filtered.filter((r) => String(r[periodoCol]) === periodo);
  }, [filtered, periodo, periodoCol]);

  // Paginación
  const pageSize = 25;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(datosPeriodo.length / pageSize));
  const sliced = datosPeriodo.slice(page * pageSize, (page + 1) * pageSize);

  // Métricas
  const totalRegistros = datosPeriodo.length;
  const empleadosUnicos = useMemo(() => {
    if (!nameCol) return 0;
    const s = new Set(datosPeriodo.map((r) => String(r[nameCol] ?? "")));
    s.delete("");
    return s.size;
  }, [datosPeriodo, nameCol]);
  const sumaMontos = useMemo(() => {
    if (!amountCol) return 0;
    return datosPeriodo.reduce((acc, r) => {
      const n = Number(r[amountCol]);
      return acc + (isNaN(n) ? 0 : n);
    }, 0);
  }, [datosPeriodo, amountCol]);
  const hojasUnicas = useMemo(() => {
    const key = "origen_hoja";
    if (!columns.includes(key)) return 1;
    return new Set(datosPeriodo.map((r) => String(r[key] ?? ""))).size;
  }, [datosPeriodo, columns]);

  // Top 5
  const topTotales = useMemo(() => {
    if (!nameCol || !amountCol) return [] as { name: string; total: number }[];
    const acc = new Map<string, number>();
    for (const r of datosPeriodo) {
      const k = String(r[nameCol] ?? "(sin nombre)");
      const n = Number(r[amountCol]);
      const amt = isNaN(n) ? 0 : n;
      acc.set(k, (acc.get(k) || 0) + amt);
    }
    return Array.from(acc.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [datosPeriodo, nameCol, amountCol]);
  const maxTop = useMemo(
    () => (topTotales.length ? Math.max(...topTotales.map((t) => t.total)) : 0),
    [topTotales]
  );
  const topPanelAvailable = Boolean(nameCol && amountCol && topTotales.length > 0);

  useEffect(() => {
    if (!topPanelAvailable) {
      setShowTopTotales(false);
    }
  }, [topPanelAvailable]);

  // Columnas visibles
  const visibleCols = useMemo(() => columns.slice(0, 30), [columns]);
  const tablaNominasDisponible = rawData.length > 0 && visibleCols.length > 0;

  useEffect(() => {
    if (!tablaNominasDisponible) {
      setShowNominasTable(false);
    }
  }, [tablaNominasDisponible]);

  /* ───── Configuración de cálculo de nómina ───────────────────── */
  const extrasThreshold = 53;
  const extraMultiplier = 1.8;

  // Editor manual de nómina eliminado: se conserva lógica histórica para calcular desde check-ins.

  async function agregarEmpleado() {
    const nuevo: EmployeePayload = {
      nombre: "Nuevo empleado",
      puesto: "Operador",
      area: "Planta",
      direccion: "",
      telefono: "",
      rfc: "",
      curp: "",
      estatus: "Activo",
      tarifa: 50,
      extraX: 1.8,
      tipoPago: "Por horas",
      pagoSemanal: 0,
    };

    try {
      // Guarda en backend
      const saved = await createEmpleado(nuevo);

      // Refresca la lista desde Mongo
      const updated = await getEmpleados();
      setEmpleados(updated);

      // Feedback visual
      showAlert(`Empleado "${saved.nombre}" creado correctamente ✅`, "success");
    } catch (err) {
      console.error("❌ Error al crear empleado:", err);
      showAlert("Error al crear empleado. Ver consola.", "error");
    }
  }

  async function guardarEmpleado(emp: Employee) {
    try {
      const current = empleados.find((e) => e._id === emp._id) ?? emp;
      const { _id, ...rest } = current;
      const upd = await updateEmpleado(_id, rest);
      setEmpleados((prev) => prev.map((e) => (e._id === upd._id ? upd : e)));
    } catch (err) {
      console.error("❌ Error al actualizar empleado:", err);
    }
  }

  async function borrarEmpleado(id: string) {
    try {
      await deleteEmpleado(id);
      setEmpleados((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      console.error("❌ Error al eliminar empleado:", err);
    }
  }

  async function guardarExtrasEmpleado() {
    if (!extraEmpleado) return;
    try {
      const clean = {
        direccion: extraForm.direccion.trim(),
        telefono: extraForm.telefono.trim(),
        rfc: extraForm.rfc.trim().toUpperCase(),
        curp: extraForm.curp.trim().toUpperCase(),
      };
      const { _id, ...rest } = { ...extraEmpleado, ...clean };
      const actualizado = await updateEmpleado(extraEmpleado._id, rest);
      setEmpleados((prev) => prev.map((e) => (e._id === actualizado._id ? actualizado : e)));
      setExtraEmpleado(null);
    } catch (err) {
      console.error("❌ Error al actualizar datos extra del empleado:", err);
      showAlert("No se pudieron guardar los datos extra. Revisa la consola.", "error");
    }
  }

  function abrirModalDescuento() {
    setDescuentoModalOpen(true);
  }

  function cerrarModalDescuento() {
    setDescuentoModalOpen(false);
    setNominaObjetivoId("");
    setDescuentoValor("");
    setPendienteValor("");
  }

  function seleccionarNomina(id: string) {
    setNominaObjetivoId(id);
    const registro = nominasSemanaSeleccionada.find((n) => n._id === id);
    if (registro) {
      setDescuentoValor(
        registro.descuentos !== undefined && registro.descuentos !== null
          ? String(registro.descuentos)
          : ""
      );
      setPendienteValor(
        registro.pendiente_descuento !== undefined && registro.pendiente_descuento !== null
          ? String(registro.pendiente_descuento)
          : ""
      );
    } else {
      setDescuentoValor("");
      setPendienteValor("");
    }
  }

  async function guardarDescuentoNomina() {
    if (!nominaObjetivoId) {
      showAlert("Selecciona un empleado de la nómina.", "warning");
      return;
    }
    if (!Number.isFinite(descuentoPropuesto) || !Number.isFinite(pendientePropuesto)) {
      showAlert("Ingresa valores numéricos válidos para descuento y pendiente.", "warning");
      return;
    }
    try {
      setGuardandoDescuento(true);
      await updateNomina(nominaObjetivoId, {
        descuentos: round2(descuentoPropuesto),
        pendiente_descuento: round2(pendientePropuesto),
      });
      await refrescarNominas();
      showAlert("✅ Descuento actualizado", "success");
      cerrarModalDescuento();
    } catch (err) {
      console.error("❌ Error al actualizar nómina:", err);
      showAlert("No se pudo actualizar la nómina. Ver consola.", "error");
    } finally {
      setGuardandoDescuento(false);
    }
  }
  /* ───── Préstamos (MongoDB) ───────────────────────────────────── */
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loadingPrestamos, setLoadingPrestamos] = useState(false);

  useEffect(() => {
    const cargarPrestamos = async () => {
      setLoadingPrestamos(true);
      try {
        const data = await getPrestamos();
        setPrestamos(data);
      } catch (err) {
        console.error("❌ Error al cargar préstamos:", err);
      } finally {
        setLoadingPrestamos(false);
      }
    };
    cargarPrestamos();
  }, []);

  async function agregarPrestamo(empleadoId: string, monto: number, descripcion: string) {
    try {
      const payload: PrestamoPayload = { empleadoId, monto, descripcion };
      const nuevo = await createPrestamo(payload);
      setPrestamos((prev) => [nuevo, ...prev]);
    } catch (err) {
      console.error("❌ Error al crear préstamo:", err);
      showAlert("Error al crear préstamo. Ver consola.", "error");
    }
  }

  async function eliminarPrestamo(id: string) {
    try {
      await deletePrestamo(id);
      setPrestamos((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("❌ Error al eliminar préstamo:", err);
    }
  }

  /* ───── Check-in ─────────────────────────────────────────────── */
  type DayPair = { in: string; out: string };
  type DayKey = "LUN" | "MAR" | "MIE" | "JUE" | "VIE" | "SAB";
  type CheckRow = { nombre: string } & Record<DayKey, DayPair>;
  type DaySaveStatus = "idle" | "saving" | "saved";
  const DAY_NAME_TO_KEY: Record<string, DayKey> = {
    Lunes: "LUN",
    Martes: "MAR",
    Miércoles: "MIE",
    Jueves: "JUE",
    Viernes: "VIE",
    Sábado: "SAB",
  };
  const TEMPLATE_DAYS: readonly string[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const DAY_DEFAULTS: Record<DayKey, DayPair> = {
    LUN: { in: "08:30", out: "18:00" },
    MAR: { in: "08:30", out: "18:00" },
    MIE: { in: "08:30", out: "18:00" },
    JUE: { in: "08:30", out: "18:00" },
    VIE: { in: "08:30", out: "18:00" },
    SAB: { in: "08:30", out: "14:00" },
  };

  const createEmptyCheckRow = (): CheckRow => ({
    nombre: "",
    LUN: { in: "", out: "" },
    MAR: { in: "", out: "" },
    MIE: { in: "", out: "" },
    JUE: { in: "", out: "" },
    VIE: { in: "", out: "" },
    SAB: { in: "", out: "" },
  });

  const [diasActivos, setDiasActivos] = useState<string[]>([]);
  const [checkData, setCheckData] = useState<Record<string, CheckRow[]>>({});
  const [historialCheckins, setHistorialCheckins] = useState<Checkin[]>([]);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [historialError, setHistorialError] = useState<string | null>(null);
  const [historialLoaded, setHistorialLoaded] = useState(false);
  const normalizarNombre = useCallback((nombre: string) => nombre.trim().toLowerCase(), []);
  const empleadoNombrePorId = useMemo(() => {
    const map = new Map<string, string>();
    empleados.forEach((emp) => {
      if (!emp._id) return;
      const nombre = (emp.nombre || "").trim();
      if (nombre) map.set(emp._id, nombre);
    });
    return map;
  }, [empleados]);

  const prestamosPorNombre = useMemo(() => {
    const map = new Map<string, Prestamo[]>();
    const parseDate = (p: Prestamo) => {
      const raw = p.fechaISO || (p as { createdAt?: string }).createdAt || "";
      return raw ? Date.parse(raw) || 0 : 0;
    };
    prestamos.forEach((prestamo) => {
      const nombre = empleadoNombrePorId.get(prestamo.empleadoId)?.trim();
      if (!nombre) return;
      const key = normalizarNombre(nombre);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(prestamo);
    });
    map.forEach((lista) => {
      lista.sort((a, b) => parseDate(b) - parseDate(a));
    });
    return map;
  }, [empleadoNombrePorId, normalizarNombre, prestamos]);
  const [manualBonos, setManualBonos] = useState<Record<string, ManualBonusFlags>>({});
  const [checkTemplateMode, setCheckTemplateMode] = useState<"nombreArriba" | null>(null);
  const [daySaveState, setDaySaveState] = useState<Record<string, DaySaveStatus>>({});
  const DAY_STATUS_LABEL: Record<DaySaveStatus, string> = {
    idle: "Pendiente",
    saving: "Guardando...",
    saved: "Guardado",
  };
  const toggleManualBono = useCallback(
    (nombre: string, tipo: keyof ManualBonusFlags) => {
      const key = normalizarNombre(nombre);
      if (!key) return;
      setManualBonos((prev) => {
        const actual = prev[key] ?? { semanal: false, mensual: false };
        return {
          ...prev,
          [key]: { ...actual, [tipo]: !actual[tipo] },
        };
      });
    },
    [normalizarNombre]
  );
  const isNombreArribaTemplate = checkTemplateMode === "nombreArriba";
  const nombreArribaDias = useMemo(
    () => TEMPLATE_DAYS.filter((dia) => diasActivos.includes(dia)),
    [diasActivos]
  );
  const weeklyNombreArribaRows = useMemo(() => {
    if (!isNombreArribaTemplate || nombreArribaDias.length === 0) return [];
    const maxRows = nombreArribaDias.reduce(
      (max, dia) => Math.max(max, checkData[dia]?.length ?? 0),
      0
    );
    return Array.from({ length: maxRows }, (_, index) => {
      const rowsPorDia = nombreArribaDias.reduce<Record<string, CheckRow | undefined>>(
        (acc, dia) => {
          acc[dia] = checkData[dia]?.[index];
          return acc;
        },
        {}
      );
      const nombre =
        nombreArribaDias.reduce<string | undefined>((found, dia) => {
          if (found) return found;
          const row = rowsPorDia[dia];
          return row?.nombre && row.nombre.trim().length > 0 ? row.nombre : undefined;
        }, undefined) ?? "";
      return { index, nombre, rowsPorDia };
    });
  }, [isNombreArribaTemplate, nombreArribaDias, checkData]);

  useEffect(() => {
    if (!diasActivos.length) {
      setDaySaveState({});
      return;
    }
    setDaySaveState((prev) => {
      const next: Record<string, DaySaveStatus> = {};
      diasActivos.forEach((dia) => {
        next[dia] = prev[dia] ?? "idle";
      });
      return next;
    });
  }, [diasActivos]);

  useEffect(() => {
    if (!semanaCheckin.trim()) {
      setDaySaveState({});
    }
  }, [semanaCheckin]);

  const totalDiasActivos = diasActivos.length;
  const savedDaysCount = diasActivos.filter((dia) => daySaveState[dia] === "saved").length;
  const hasPendingDays = diasActivos.some((dia) => daySaveState[dia] !== "saved");
  const canCloseWeek = totalDiasActivos > 0 && !hasPendingDays;

  const actualizarNombreArribaNombre = useCallback(
    (rowIndex: number, nombre: string) => {
      if (!isNombreArribaTemplate || !nombreArribaDias.length) return;
      setCheckData((prev) => {
        const next = { ...prev };
        nombreArribaDias.forEach((dia) => {
          const rows = [...(next[dia] ?? [])];
          while (rows.length <= rowIndex) rows.push(createEmptyCheckRow());
          const current = rows[rowIndex];
          rows[rowIndex] = { ...current, nombre };
          next[dia] = rows;
        });
        return next;
      });
    },
    [isNombreArribaTemplate, nombreArribaDias]
  );

  const actualizarNombreArribaHorario = useCallback(
    (dia: string, rowIndex: number, field: keyof DayPair, value: string) => {
      if (!isNombreArribaTemplate) return;
      const dayKey = DAY_NAME_TO_KEY[dia];
      if (!dayKey) return;
      setCheckData((prev) => {
        const rows = [...(prev[dia] ?? [])];
        while (rows.length <= rowIndex) rows.push(createEmptyCheckRow());
        const current = rows[rowIndex];
        rows[rowIndex] = {
          ...current,
          [dayKey]: { ...current[dayKey], [field]: value },
        };
        return { ...prev, [dia]: rows };
      });
    },
    [isNombreArribaTemplate]
  );

  const agregarNombreArribaRow = useCallback(() => {
    if (!isNombreArribaTemplate || !nombreArribaDias.length) return;
    setCheckData((prev) => {
      const next = { ...prev };
      nombreArribaDias.forEach((dia) => {
        const rows = [...(next[dia] ?? [])];
        rows.push(createEmptyCheckRow());
        next[dia] = rows;
      });
      return next;
    });
  }, [isNombreArribaTemplate, nombreArribaDias]);

  const eliminarNombreArribaRow = useCallback(
    (rowIndex: number) => {
      if (!isNombreArribaTemplate || !nombreArribaDias.length) return;
      setCheckData((prev) => {
        const next = { ...prev };
        nombreArribaDias.forEach((dia) => {
          next[dia] = (next[dia] ?? []).filter((_, idx) => idx !== rowIndex);
        });
        return next;
      });
    },
    [isNombreArribaTemplate, nombreArribaDias]
  );

  const historialDias = useMemo(() => {
    type HistorialDiaInternal = {
      key: string;
      fechaLabel: string;
      fechaOrden: number;
      dia: string;
      semana: string;
      total: number;
      nombres: Set<string>;
    };
    const map = new Map<string, HistorialDiaInternal>();

    historialCheckins.forEach((registro) => {
      const fechaRaw = registro.fecha ?? registro.createdAt ?? "";
      const parsedDate = fechaRaw ? new Date(fechaRaw) : null;
      const timestamp = parsedDate?.getTime();
      const fechaValida = typeof timestamp === "number" && !Number.isNaN(timestamp);
      const fechaDate = fechaValida ? parsedDate : null;
      const fechaClave = fechaDate ? fechaDate.toISOString().slice(0, 10) : "sin-fecha";
      const key = `${fechaClave}|${registro.semana ?? ""}|${registro.dia}`;
      const fechaLabel = fechaDate
        ? fechaDate.toLocaleDateString(undefined, {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Sin fecha";
      const fechaOrden = fechaValida ? timestamp ?? 0 : 0;

      const current = map.get(key);
      if (current) {
        current.total += 1;
        if (registro.nombre) current.nombres.add(registro.nombre);
      } else {
        const nombresSet = new Set<string>();
        if (registro.nombre) nombresSet.add(registro.nombre);
        map.set(key, {
          key,
          fechaLabel,
          fechaOrden,
          dia: registro.dia,
          semana: registro.semana ?? "",
          total: 1,
          nombres: nombresSet,
        });
      }
    });

    return Array.from(map.values())
      .map((entry) => ({
        key: entry.key,
        fechaLabel: entry.fechaLabel,
        fechaOrden: entry.fechaOrden,
        dia: entry.dia,
        semana: entry.semana,
        total: entry.total,
        nombres: Array.from(entry.nombres).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => b.fechaOrden - a.fechaOrden);
  }, [historialCheckins]);

  const HISTORIAL_MAX_FILAS = 25;

  const BONUS_WEEKLY_HOURS = 53;
  const BONUS_WEEKLY_AMOUNT = 150;
  const BONUS_MONTHLY_STREAK = 4;
  const BONUS_MONTHLY_AMOUNT = 1600;

  const resumenBonosSemana = useMemo(() => {
    const displayNames = new Map<string, string>();

    const currentTotals = new Map<string, number>();
    diasActivos.forEach((dia) => {
      const dayKey = DAY_NAME_TO_KEY[dia] ?? "LUN";
      const rows = checkData[dia] ?? [];
      rows.forEach((row) => {
        const nombreRaw = row.nombre?.trim();
        if (!nombreRaw) return;
        const key = normalizarNombre(nombreRaw);
        displayNames.set(key, nombreRaw);
        const horas = spanHours(row[dayKey].in, row[dayKey].out);
        if (horas <= 0) return;
        currentTotals.set(key, (currentTotals.get(key) ?? 0) + horas);
      });
    });

    const historialSemanas = new Map<
      string,
      { orden: number; empleados: Map<string, number> }
    >();
    let fallbackOrder = 0;

    const obtenerOrden = (registro: Checkin): number => {
      const dateStr = registro.fecha ?? registro.createdAt ?? registro.updatedAt;
      if (dateStr) {
        const parsed = Date.parse(dateStr);
        if (Number.isFinite(parsed)) return parsed;
      }
      fallbackOrder += 1;
      return Number.MAX_SAFE_INTEGER - fallbackOrder;
    };

    historialCheckins.forEach((registro) => {
      const semana = registro.semana?.trim();
      const nombreRaw = registro.nombre?.trim();
      if (!semana || !nombreRaw) return;
      const key = normalizarNombre(nombreRaw);
      displayNames.set(key, nombreRaw);
      const horas = safeNumber(registro.horasTotales);

      const entry = historialSemanas.get(semana);
      if (entry) {
        entry.empleados.set(key, (entry.empleados.get(key) ?? 0) + horas);
        const orden = obtenerOrden(registro);
        if (orden < entry.orden) entry.orden = orden;
      } else {
        historialSemanas.set(semana, {
          orden: obtenerOrden(registro),
          empleados: new Map([[key, horas]]),
        });
      }
    });

    const historialPorEmpleado = new Map<
      string,
      Array<{ semana: string; orden: number; horas: number; esActual?: boolean }>
    >();

    historialSemanas.forEach(({ orden, empleados }, semana) => {
      empleados.forEach((horas, key) => {
        const lista = historialPorEmpleado.get(key) ?? [];
        lista.push({ semana, orden, horas });
        historialPorEmpleado.set(key, lista);
      });
    });

    const orderValues = Array.from(historialSemanas.values()).map((v) =>
      Number.isFinite(v.orden) ? v.orden : 0
    );
    const baseOrder =
      orderValues.length > 0 ? Math.max(...orderValues) : Date.now();

    const weekLabel = semanaCheckin.trim() || "Semana en captura";
    if (currentTotals.size > 0) {
      const currentOrder = baseOrder + 1;
      currentTotals.forEach((horas, key) => {
        const lista = historialPorEmpleado.get(key) ?? [];
        lista.push({
          semana: weekLabel,
          orden: currentOrder,
          horas,
          esActual: true,
        });
        historialPorEmpleado.set(key, lista);
      });
    }

    const resultados = Array.from(currentTotals.entries()).map(
      ([key, horas]) => {
        const lista = historialPorEmpleado.get(key) ?? [];
        lista.sort(
          (a, b) => a.orden - b.orden || a.semana.localeCompare(b.semana)
        );
        let streak = 0;
        for (let i = lista.length - 1; i >= 0; i--) {
          if (safeNumber(lista[i].horas) >= BONUS_WEEKLY_HOURS) streak += 1;
          else break;
        }
        const semanal = horas >= BONUS_WEEKLY_HOURS;
        const mensual = semanal && streak >= BONUS_MONTHLY_STREAK;
        return {
          nombre: displayNames.get(key) ?? key,
          horas: round2(horas),
          semanal,
          mensual,
        };
      }
    );

    resultados.sort(
      (a, b) =>
        safeNumber(b.horas) - safeNumber(a.horas) ||
        a.nombre.localeCompare(b.nombre)
    );
    return resultados;
  }, [diasActivos, checkData, semanaCheckin, historialCheckins, normalizarNombre]);

  const bonosAplicables = useMemo(() => {
    const map = new Map<string, { bonoSemanal: number; bonoMensual: number }>();

    resumenBonosSemana.forEach((row) => {
      const key = normalizarNombre(row.nombre);
      if (!key) return;
      const manual = manualBonos[key];
      const aplicaSemanal = row.semanal || Boolean(manual?.semanal);
      const aplicaMensual = row.mensual || Boolean(manual?.mensual);
      map.set(key, {
        bonoSemanal: aplicaSemanal ? BONUS_WEEKLY_AMOUNT : 0,
        bonoMensual: aplicaMensual ? BONUS_MONTHLY_AMOUNT : 0,
      });
    });

    Object.entries(manualBonos).forEach(([key, flags]) => {
      if (map.has(key)) return;
      const aplicaSemanal = Boolean(flags?.semanal);
      const aplicaMensual = Boolean(flags?.mensual);
      if (!aplicaSemanal && !aplicaMensual) return;
      map.set(key, {
        bonoSemanal: aplicaSemanal ? BONUS_WEEKLY_AMOUNT : 0,
        bonoMensual: aplicaMensual ? BONUS_MONTHLY_AMOUNT : 0,
      });
    });

    return map;
  }, [BONUS_MONTHLY_AMOUNT, BONUS_WEEKLY_AMOUNT, manualBonos, normalizarNombre, resumenBonosSemana]);

  const crearNominaDesdeResumen = useCallback(
    (resumen: CloseCheckinWeekResponse, semanaOverride?: string): NominaPayload => {
      const empleadosNomina: NominaEmpleado[] = (resumen.empleados ?? []).map((registro) => {
        const nombre = registro.nombre?.trim() || "Sin nombre";
        const claveNombre = normalizarNombre(nombre);
        const bonos = claveNombre ? bonosAplicables.get(claveNombre) : undefined;
        const horasTotales = safeNumber(registro.horasTotales);
        const umbralPrimarias = extrasThreshold > 0 ? extrasThreshold : horasTotales;
        const horasPrimarias = Math.min(horasTotales, umbralPrimarias);
        const horasExtras = Math.max(0, horasTotales - umbralPrimarias);

        const empleadoData = empleados.find(
          (emp) => emp.nombre?.toLowerCase().trim() === nombre.toLowerCase()
        );

        let costoHoraPrimaria = safeNumber(empleadoData?.tarifa);
        if (!costoHoraPrimaria && empleadoData?.tipoPago === "Semanal fijo") {
          const divisor = umbralPrimarias || horasTotales || 1;
          costoHoraPrimaria = safeNumber(empleadoData?.pagoSemanal) / divisor;
        }
        if (!costoHoraPrimaria) costoHoraPrimaria = 0;

        const multiplicadorExtra =
          safeNumber(empleadoData?.extraX) > 0
            ? safeNumber(empleadoData?.extraX)
            : extraMultiplier || 1.8;
        const costoHoraExtra =
          multiplicadorExtra > 0 ? costoHoraPrimaria * multiplicadorExtra : costoHoraPrimaria;

        const pagoHorasPrimarias = horasPrimarias * costoHoraPrimaria;
        const pagoHorasExtras = horasExtras * costoHoraExtra;
        const pagoSemanalCalc = pagoHorasPrimarias + pagoHorasExtras;
        const pagoSemanalBase = safeNumber(empleadoData?.pagoSemanal);
        const descuentos = 0;
        const pendienteDescuento = 0;
        const bonoSemanal = safeNumber(bonos?.bonoSemanal);
        const bonoMensual = safeNumber(bonos?.bonoMensual);
        const comision = 0;

        const total = pagoSemanalCalc - descuentos;
        const total2 = total + bonoSemanal;
        const totalConBonoMensual = total2 + bonoMensual;
        const totalFinal = totalConBonoMensual + comision;

        return {
          nombre,
          total_horas: round2(horasTotales),
          horas_primarias: round2(horasPrimarias),
          horas_extras: round2(horasExtras),
          pago_semanal_base: round2(pagoSemanalBase),
          costo_hora_primaria: round2(costoHoraPrimaria),
          total_horas_primarias: round2(horasPrimarias),
          pago_horas_primarias: round2(pagoHorasPrimarias),
          costo_hora_extra: round2(costoHoraExtra),
          pago_horas_extras: round2(pagoHorasExtras),
          pago_semanal_calc: round2(pagoSemanalCalc),
          descuentos: round2(descuentos),
          pendiente_descuento: round2(pendienteDescuento),
          total: round2(total),
          bono_semanal: round2(bonoSemanal),
          total_2: round2(total2),
          bono_mensual: round2(bonoMensual),
          comision: round2(comision),
          comisiones: round2(comision),
          total_con_bono_mensual: round2(totalConBonoMensual),
          total_con_comision: round2(totalFinal),
          extra: null,
          total_final: round2(totalFinal),
        };
      });

      const totalGeneral = empleadosNomina.reduce(
        (acc, emp) => acc + safeNumber(emp.total_final),
        0
      );

      return {
        semana: semanaOverride?.trim() || resumen.semana,
        empleados: empleadosNomina,
        totalGeneral: round2(totalGeneral),
      };
    },
    [bonosAplicables, empleados, extraMultiplier, extrasThreshold, normalizarNombre]
  );

  /* ───── Descuentos de nómina ─────────────────────────────────── */
  const [descuentoModalOpen, setDescuentoModalOpen] = useState(false);
  const [semanaObjetivo, setSemanaObjetivo] = useState<string>("");
  const [nominaObjetivoId, setNominaObjetivoId] = useState<string>("");
  const [descuentoValor, setDescuentoValor] = useState<string>("");
  const [pendienteValor, setPendienteValor] = useState<string>("");
  const [guardandoDescuento, setGuardandoDescuento] = useState(false);

  const nominasPorSemana = useMemo(() => {
    const map = new Map<string, NominaRegistro[]>();
    (rawData as NominaRegistro[]).forEach((registro) => {
      const semana = (registro.semana ?? "").trim();
      if (!map.has(semana)) map.set(semana, []);
      map.get(semana)!.push(registro);
    });
    return map;
  }, [rawData]);

  useEffect(() => {
    if (!editNominaSemana) {
      setEditNominaOriginal([]);
      setEditNominaRows([]);
      return;
    }
    const registros = nominasPorSemana.get(editNominaSemana) ?? [];
    if (!registros.length) {
      setEditNominaOriginal([]);
      setEditNominaRows([]);
      return;
    }
    const toInput = (value: unknown) => {
      const normalized = round2(safeNumber(value));
      return Number.isFinite(normalized) ? String(normalized) : "0";
    };
    setEditNominaOriginal(registros);
    setEditNominaRows(
      registros.map((registro) => ({
        _id: registro._id,
        nombre: String(registro.nombre ?? ""),
        pago_semanal_calc: toInput(
          registro.pago_semanal_calc ?? registro.total_final ?? registro.total ?? 0
        ),
        bono_semanal: toInput(registro.bono_semanal ?? 0),
        bono_mensual: toInput(registro.bono_mensual ?? 0),
        comision: toInput(extraerComision(registro)),
        descuentos: toInput(registro.descuentos ?? 0),
        pendiente_descuento: toInput(registro.pendiente_descuento ?? 0),
        total_final: toInput(registro.total_final ?? registro.pago_semanal_calc ?? 0),
      }))
    );
  }, [editNominaSemana, nominasPorSemana]);

  useEffect(() => {
    if (!editNominaSemana) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [editNominaSemana]);

  const editNominaTotalOriginal = useMemo(() => {
    if (!editNominaOriginal.length) return 0;
    return round2(
      editNominaOriginal.reduce(
        (acc, registro) =>
          acc +
          safeNumber(
            registro.total_final ?? registro.pago_semanal_calc ?? registro.total ?? 0
          ),
        0
      )
    );
  }, [editNominaOriginal]);

  const editNominaTotalPreview = useMemo(() => {
    if (!editNominaRows.length) return 0;
    return round2(
      editNominaRows.reduce(
        (acc, row) => acc + safeNumber(row.total_final || row.pago_semanal_calc),
        0
      )
    );
  }, [editNominaRows]);

  const [filtroHistorialNominas, setFiltroHistorialNominas] = useState("");

  const nominasFiltradas = useMemo(() => {
    if (!filtroHistorialNominas.trim()) return nominasGuardadas;
    const needle = filtroHistorialNominas.trim().toLowerCase();
    return nominasGuardadas.filter((nomina) => {
      const coincideSemana = nomina.semana?.toLowerCase().includes(needle);
      const coincideEmpleado = (nomina.empleados ?? []).some((emp) =>
        String(emp.nombre ?? "").toLowerCase().includes(needle)
      );
      return coincideSemana || coincideEmpleado;
    });
  }, [nominasGuardadas, filtroHistorialNominas]);

  const empleadosHistorialNominas = useMemo(() => {
    const set = new Set<string>();
    (nominasFiltradas as NominaSemana[]).forEach((nomina) => {
      (nomina.empleados ?? []).forEach((emp) => {
        const nombre = String(emp.nombre ?? "").trim();
        if (nombre) set.add(nombre);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [nominasFiltradas]);

  const semanasDisponiblesNomina = useMemo(() => {
    return Array.from(nominasPorSemana.keys())
      .filter((sem) => sem && sem.length > 0)
      .sort((a, b) => b.localeCompare(a));
  }, [nominasPorSemana]);

  const nominasSemanaSeleccionada = useMemo(() => {
    if (!semanaObjetivo) return [] as NominaRegistro[];
    const lista = nominasPorSemana.get(semanaObjetivo) ?? [];
    return [...lista]
      .filter((n) => n._id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [nominasPorSemana, semanaObjetivo]);

  const registroNominaSeleccionado = useMemo(() => {
    if (!nominaObjetivoId) return null;
    return nominasSemanaSeleccionada.find((n) => n._id === nominaObjetivoId) ?? null;
  }, [nominasSemanaSeleccionada, nominaObjetivoId]);

  const prestamosEmpleadoSeleccionado = useMemo(() => {
    if (!registroNominaSeleccionado) return [];
    const nombreClave = normalizarNombre(String(registroNominaSeleccionado.nombre ?? ""));
    if (!nombreClave) return [];
    return prestamosPorNombre.get(nombreClave) ?? [];
  }, [normalizarNombre, prestamosPorNombre, registroNominaSeleccionado]);

  const totalPrestamosEmpleado = useMemo(
    () =>
      round2(
        prestamosEmpleadoSeleccionado.reduce(
          (acc, prestamo) => acc + safeNumber(prestamo.monto),
          0
        )
      ),
    [prestamosEmpleadoSeleccionado]
  );

  const usarPrestamoEnFormulario = useCallback(
    (monto: number) => {
      const normalized = round2(safeNumber(monto));
      if (!normalized || normalized <= 0) return;
      setDescuentoValor(String(normalized));
      setPendienteValor("0");
    },
    [setDescuentoValor, setPendienteValor]
  );

  const descuentoPropuesto = Number(descuentoValor || 0);
  const pendientePropuesto = Number(pendienteValor || 0);
  const descuentoAnterior = registroNominaSeleccionado ? safeNumber(registroNominaSeleccionado.descuentos) : 0;
  const pendienteAnterior = registroNominaSeleccionado ? safeNumber(registroNominaSeleccionado.pendiente_descuento) : 0;
  const pagoBaseNomina = registroNominaSeleccionado
    ? safeNumber(
        registroNominaSeleccionado.total_final ??
          registroNominaSeleccionado.pago_semanal_calc ??
          registroNominaSeleccionado.total ??
          0
      )
    : 0;
  const nuevoTotalEstimado =
    registroNominaSeleccionado && Number.isFinite(descuentoPropuesto)
      ? round2(pagoBaseNomina - descuentoPropuesto)
      : pagoBaseNomina;

  useEffect(() => {
    if (!descuentoModalOpen) {
      setSemanaObjetivo("");
      setNominaObjetivoId("");
      setDescuentoValor("");
      setPendienteValor("");
      return;
    }
    const preferida = sectionTitle || semanasDisponiblesNomina[0] || "";
    if (preferida) {
      setSemanaObjetivo(preferida);
    }
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [descuentoModalOpen, sectionTitle, semanasDisponiblesNomina]);

  useEffect(() => {
    if (!descuentoModalOpen) return;
    setNominaObjetivoId("");
    setDescuentoValor("");
    setPendienteValor("");
  }, [semanaObjetivo, descuentoModalOpen]);


  function resumirNombres(nombres: string[]): string {
    if (!nombres.length) return "—";
    const limite = 5;
    const visibles = nombres.slice(0, limite);
    const restantes = nombres.length - visibles.length;
    return restantes > 0
      ? `${visibles.join(", ")} y ${restantes} más`
      : visibles.join(", ");
  }

  function abrirEditorNominaSemanaObjetivo(nomina: NominaSemana) {
    const semana = (nomina.semana ?? "").trim();
    if (!semana) {
      showAlert("No se puede editar una nómina sin semana identificada.", "warning");
      return;
    }
    const registros = nominasPorSemana.get(semana) ?? [];
    if (!registros.length) {
      showAlert("No se encontraron registros asociados a esta semana.", "warning");
      return;
    }
    setEditNominaSemana(semana);
  }

  function cerrarEditorNomina() {
    setEditNominaRows([]);
    setEditNominaOriginal([]);
    setEditNominaSemana(null);
  }

  function actualizarFilaNomina(index: number, campo: keyof EditableNominaRow, valor: string) {
    setEditNominaRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [campo]: valor } : row))
    );
  }

  function parseEditableNumber(valor: string): number {
    if (!valor) return 0;
    const normalizado = valor.replace(",", ".");
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  async function guardarEdicionNominaSemana() {
    if (!editNominaSemana) return;
    if (!editNominaOriginal.length || editNominaOriginal.length !== editNominaRows.length) {
      showAlert("No hay datos válidos para guardar.", "warning");
      return;
    }
    try {
      setEditNominaSaving(true);
      const actualizados = editNominaOriginal.map((registro, index) => {
        const draft = editNominaRows[index];
        const pagoCalc = round2(parseEditableNumber(draft.pago_semanal_calc));
        const totalFinal = round2(
          parseEditableNumber(draft.total_final || draft.pago_semanal_calc)
        );
        const descuentos = round2(parseEditableNumber(draft.descuentos));
        const pendiente = round2(parseEditableNumber(draft.pendiente_descuento));
        const bonoSemanal = round2(parseEditableNumber(draft.bono_semanal));
        const bonoMensual = round2(parseEditableNumber(draft.bono_mensual));
        const comision = round2(parseEditableNumber(draft.comision));
        return {
          ...registro,
          pago_semanal_calc: pagoCalc,
          total_final: totalFinal,
          total: totalFinal,
          descuentos,
          pendiente_descuento: pendiente,
          bono_semanal: bonoSemanal,
          bono_mensual: bonoMensual,
          comision,
          comisiones: comision,
        };
      });

      const totalGeneral = round2(
        actualizados.reduce(
          (acc, registro) =>
            acc +
            safeNumber(
              registro.total_final ?? registro.pago_semanal_calc ?? registro.total ?? 0
            ),
          0
        )
      );

      await createNomina({
        semana: editNominaSemana,
        empleados: actualizados,
        totalGeneral,
      });
      await refrescarNominas();
      showAlert("✅ Nómina actualizada", "success");
      cerrarEditorNomina();
    } catch (err) {
      console.error("❌ Error al actualizar nómina:", err);
      showAlert("No se pudo actualizar la nómina. Revisa la consola para más detalles.", "error");
    } finally {
      setEditNominaSaving(false);
    }
  }

  async function eliminarNominaSemana(semana: string) {
    const normalizada = (semana ?? "").trim();
    if (!normalizada) {
      showAlert("Semana inválida. No se puede eliminar la nómina.", "warning");
      return;
    }
    if (typeof window !== "undefined") {
      const confirmada = window.confirm(
        `¿Eliminar todas las nóminas guardadas para "${normalizada}"? Esta acción no se puede deshacer.`
      );
      if (!confirmada) return;
    }
    try {
      setDeleteNominaLoading(true);
      setDeleteSemanaTarget(normalizada);
      await deleteNominasBySemana(normalizada);
      await refrescarNominas();
      showAlert(`✅ Nómina de "${normalizada}" eliminada.`, "success");
      if (editNominaSemana === normalizada) {
        cerrarEditorNomina();
      }
    } catch (err) {
      console.error("❌ Error al eliminar nómina:", err);
      showAlert("No se pudo eliminar la nómina. Revisa la consola para más detalles.", "error");
    } finally {
      setDeleteNominaLoading(false);
      setDeleteSemanaTarget(null);
    }
  }

  const cargarHistorial = useCallback(
    async (force = false) => {
      if (historialCargando) return;
      if (!force && historialLoaded) return;
      try {
        setHistorialCargando(true);
        setHistorialError(null);
        const data = await getCheckins();
        setHistorialCheckins(data);
        setHistorialLoaded(true);
      } catch (err) {
        console.error("❌ Error al cargar historial de check-ins:", err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        setHistorialError(message);
      } finally {
        setHistorialCargando(false);
      }
    },
    [historialCargando, historialLoaded]
  );

  const updateDiaRows = (dia: string, updater: (rows: CheckRow[]) => CheckRow[]) => {
    setCheckData((prev) => {
      const current = prev[dia] ?? [];
      const next = updater(current);
      return { ...prev, [dia]: next };
    });
  };

  const addCheckRow = () => {
    if (checkTemplateMode === "nombreArriba") {
      setCheckData((prev) => {
        const next = { ...prev };
        TEMPLATE_DAYS.forEach((dia) => {
          if (!diasActivos.includes(dia)) return;
          const rows = [...(next[dia] ?? [])];
          rows.push(createEmptyCheckRow());
          next[dia] = rows;
        });
        return next;
      });
      return;
    }
    const dia = diasActivos[diasActivos.length - 1];
    if (!dia) {
      showAlert("Agrega un día antes de insertar filas.", "warning");
      return;
    }
    updateDiaRows(dia, (rows) => [...rows, createEmptyCheckRow()]);
  };

  useEffect(() => {
    if (section !== "checkin") return;
    void cargarHistorial();
  }, [section, cargarHistorial]);

  function loadNombreArribaTemplate() {
    const select = document.getElementById("nuevo-dia") as HTMLSelectElement | null;
    const diasTemplate = [...TEMPLATE_DAYS];
    const template: Record<string, CheckRow[]> = {};
    const rowsPerDay = 12;

    diasTemplate.forEach((dia) => {
      const dayKey = DAY_NAME_TO_KEY[dia];
      if (!dayKey) return;
      template[dia] = Array.from({ length: rowsPerDay }, () => {
        const base = createEmptyCheckRow();
        base.nombre = "";
        (Object.entries(DAY_DEFAULTS) as Array<[DayKey, DayPair]>).forEach(([key, defaults]) => {
          base[key] = { ...defaults };
        });
        return base;
      });
    });

    setDiasActivos(diasTemplate);
    setCheckData(template);
    if (select) select.value = "";
    setCheckTemplateMode("nombreArriba");
    setDaySaveState({});
  }

  async function guardarCheckins(dia: string) {
    try {
      const semana = semanaCheckin.trim();
      if (!semana) {
        showAlert("Define un título de semana antes de guardar.", "warning");
        setDaySaveState((prev) => ({ ...prev, [dia]: "idle" }));
        return;
      }
      const dayKey = DAY_NAME_TO_KEY[dia] ?? "LUN";
      const registros = (checkData[dia] || []).map((r) => ({
        nombre: r.nombre,
        dia,
        horaEntrada: r[dayKey].in,
        horaSalida: r[dayKey].out,
        horasTotales: spanHours(r[dayKey].in, r[dayKey].out),
        semana,
      }));

      if (!registros.length) {
        showAlert("⚠️ No hay registros para guardar.", "warning");
        setDaySaveState((prev) => ({ ...prev, [dia]: "idle" }));
        return;
      }

      setDaySaveState((prev) => ({ ...prev, [dia]: "saving" }));
      await createCheckins(registros);
      await cargarHistorial(true);
      setDaySaveState((prev) => ({ ...prev, [dia]: "saved" }));
      showAlert(`✅ Check-ins del ${dia} guardados correctamente.`, "success");
    } catch (err) {
      console.error("❌ Error al guardar check-ins:", err);
      setDaySaveState((prev) => ({ ...prev, [dia]: "idle" }));
      showAlert("Error al guardar check-ins. Ver consola.", "error");
    }
  }

  /* ───── Billetes (estado + persistencia) ─────────────────────── */
  type Den = 1000 | 500 | 200 | 100 | 50;
  type BilletesEntry = {
    id: string;
    fechaISO: string;     // registro
    nota: string;
    desglose: Record<Den, number>; // conteo por denominación
    total: number;
  };

  const DENOMS: Den[] = [1000, 500, 200, 100, 50];

  const [billetes, setBilletes] = useState<BilletesEntry[]>(() => {
    try {
      const saved = localStorage.getItem("billetes_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  useEffect(() => {
    try {
      localStorage.setItem("billetes_v1", JSON.stringify(billetes));
    } catch {}
  }, [billetes]);

  // Estado del formulario de billetes
  const [counts, setCounts] = useState<Record<Den, number>>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
  });
  const [notaBilletes, setNotaBilletes] = useState("");

  const totalBilletes = useMemo(
    () => DENOMS.reduce((acc, d) => acc + d * (counts[d] || 0), 0),
    [counts]
  );

  function setCount(den: Den, value: number) {
    setCounts((c) => ({ ...c, [den]: Math.max(0, Math.floor(value || 0)) }));
  }

  // Preset solicitado: 10,000 con 5×1000, 5×500 y resto en 100
  function presetDiezMil() {
    const fives1000 = 5 * 1000; // 5000
    const fives500 = 5 * 500;   // 2500
    const base = fives1000 + fives500; // 7500
    const restante = 10000 - base;     // 2500
    const de100 = Math.max(0, Math.floor(restante / 100)); // 25
    setCounts({
      1000: 5,
      500: 5,
      200: 0,
      100: de100, // 25
      50: 0,
    });
    setNotaBilletes("Entrega estándar 10k (5×1000, 5×500, resto en 100).");
  }

  function limpiarBilletes() {
    setCounts({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0 });
    setNotaBilletes("");
  }

  function registrarEntrega() {
    if (totalBilletes <= 0) {
      showAlert("Captura al menos un billete.", "warning");
      return;
    }
    const entry: BilletesEntry = {
      id: crypto.randomUUID(),
      fechaISO: new Date().toISOString(),
      nota: notaBilletes.trim(),
      desglose: { ...counts },
      total: totalBilletes,
    };
    setBilletes((prev) => [entry, ...prev]);
    limpiarBilletes();
  }

  function exportarBilletesCSV() {
    if (!billetes.length) return;
    const rows = billetes.map((b) => ({
      id: b.id,
      fecha: b.fechaISO,
      nota: b.nota,
      "1000": b.desglose[1000] || 0,
      "500": b.desglose[500] || 0,
      "200": b.desglose[200] || 0,
      "100": b.desglose[100] || 0,
      "50": b.desglose[50] || 0,
      total: b.total,
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "billetes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ────────────────────────────────────────────────────────────── UI  */
  return (
    <div className="min-h-screen bg-gradient-to-br from-petro-off to-petro-paper dark:from-petro-ink dark:to-petro-charcoal text-petro-ink dark:text-petro-paper transition-colors">
      {/* HEADER */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-petro-charcoal/60 border-b border-petro-line/60 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-transparent bg-clip-text bg-gradient-to-r from-petro-red to-petro-redDark text-xl font-extrabold tracking-tight select-none">
            PetroArte
          </div>
          <span className="opacity-60 text-sm">· Panel de Gestión</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow hover:shadow-md active:scale-[0.98] transition"
              title="Cambiar tema claro/oscuro"
            >
              {dark ? "🌙 Oscuro" : "☀️ Claro"}
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[230px_1fr] gap-6">
        {/* SIDEBAR */}
        <aside className="hidden md:block">
          <div className="rounded-2xl p-3 bg-gradient-to-b from-petro-redDark to-petro-red text-white shadow-xl ring-1 ring-white/30">
            <div className="px-2 py-2 text-sm/relaxed opacity-90">Navegación</div>
            <nav className="space-y-2 mt-1">
              {navItems.map((item, idx) => {
                const isActive = item.key === section;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      isActive
                        ? "bg-white/25 text-white shadow-lg border-white/40"
                        : "bg-white/5 text-white/90 border-white/10 hover:bg-white/15"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`text-xl ${isActive ? "scale-110" : ""}`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold leading-tight">{item.label}</p>
                        <p className="text-xs opacity-80 leading-snug">{item.description}</p>
                      </div>
                    </div>
                    <span className="mt-2 inline-block text-[10px] uppercase tracking-[0.3em] opacity-70">
                      Paso 0{idx + 1}
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 text-xs/relaxed px-3 py-3 bg-white/10 rounded-xl border border-white/20">
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-80">Consejo</div>
              <div className="opacity-90 leading-relaxed">
                {sectionGuide?.helper ?? "Elige una sección para ver la guía."}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="space-y-6">
          <div className="md:hidden -mx-1">
            <nav className="flex gap-2 overflow-x-auto pb-2 px-1">
              {navItems.map((item) => {
                const isActive = item.key === section;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSection(item.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm font-semibold transition ${
                      isActive
                        ? "bg-petro-red text-white border-transparent shadow-md dark:bg-petro-redDark"
                        : "bg-white text-petro-ink border-petro-line/70 dark:bg-white/10 dark:text-white dark:border-white/20"
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {sectionGuide && <SectionGuide info={sectionGuide} />}

          {/* ─────────────── CHECK-IN ─────────────── */}
          {section === "checkin" && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className="px-3 py-2 flex-1 min-w-[280px] rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    placeholder='Semana (ej. "SEMANA #42 DEL 20 AL 26 OCT")'
                    value={semanaCheckin}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSemanaCheckin(value);
                      if (!semanaNominaTouched) {
                        setSemanaNomina(value);
                      }
                    }}
                  />
                  <input
                    className="px-3 py-2 flex-1 min-w-[280px] rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    placeholder="Semana para nómina (puedes editarla)"
                    value={semanaNomina}
                    onChange={(e) => {
                      setSemanaNominaTouched(true);
                      setSemanaNomina(e.target.value);
                    }}
                    title="Define cómo se guardará el nombre de semana en nóminas"
                  />
                  <button
                    className="px-3 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    onClick={() => {
                      setSemanaNominaTouched(false);
                      setSemanaNomina(semanaCheckin);
                    }}
                    title="Sincronizar con el título de la semana de check-in"
                    type="button"
                  >
                    Sincronizar
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow"
                    onClick={addCheckRow}
                  >
                    + Agregar fila
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    onClick={loadNombreArribaTemplate}
                  >
                    Cargar plantilla (Semana Tipica)
                  </button>
                </div>
              </div>

              {/* SCROLL CONTROLADO */}
              <div className="rounded-2xl shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                {/* Selector de día */}
                <div className="flex flex-wrap gap-3 items-center mb-4 px-4 pt-4">
                  <select
                    id="nuevo-dia"
                    className="px-3 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    defaultValue=""
                  >
                    <option value="">Seleccionar día…</option>
                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      const select = document.getElementById("nuevo-dia") as HTMLSelectElement | null;
                      if (!select) return;
                      const dia = select.value;
                      if (!dia) return showAlert("Selecciona un día antes de agregar.", "warning");
                      if (diasActivos.includes(dia))
                        return showAlert(`⚠️ El día ${dia} ya está agregado.`, "warning");

                      setDiasActivos((prev) => [...prev, dia]);
                      setCheckData((prev) => ({
                        ...prev,
                        [dia]: [
                          {
                            nombre: "",
                            LUN: { in: "", out: "" },
                            MAR: { in: "", out: "" },
                            MIE: { in: "", out: "" },
                            JUE: { in: "", out: "" },
                            VIE: { in: "", out: "" },
                            SAB: { in: "", out: "" },
                          },
                        ],
                      }));
                      select.value = "";
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow"
                  >
                    + Agregar día
                  </button>
                </div>

                {isNombreArribaTemplate && (
                  <div className="px-4 pb-4">
                    <div className="rounded-2xl border border-dashed border-petro-line/70 dark:border-white/15 bg-white/80 dark:bg-white/5 p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-petro-redDark dark:text-petro-redLight">
                            Plantilla: Modo Tabla
                          </p>
                          <p className="text-xs opacity-70">
                            Captura el nombre y debajo ajusta entrada/salida para Lunes a Sábado en una sola tarjeta.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={agregarNombreArribaRow}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow"
                        >
                          + Agregar empleado semanal
                        </button>
                      </div>
                      {!nombreArribaDias.length ? (
                        <p className="text-sm opacity-70">
                          Activa al menos un día para utilizar esta plantilla.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          {weeklyNombreArribaRows.length === 0 ? (
                            <p className="text-sm opacity-70">
                              Usa “Agregar empleado semanal” para crear la primera tarjeta con los 6 días.
                            </p>
                          ) : (
                            <table className="w-full text-sm">
                              <tbody>
                                {weeklyNombreArribaRows.map((row) => (
                                  <tr key={`nombre-arriba-${row.index}`}>
                                    <td className="p-2" colSpan={7}>
                                      <div className="rounded-2xl border border-petro-line/60 dark:border-white/15 bg-white/95 dark:bg-white/5 p-3 space-y-3 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            Nombre
                                          </label>
                                          <input
                                            list={`empleados-nombre-arriba-${row.index}`}
                                            value={row.nombre}
                                            onChange={(event) =>
                                              actualizarNombreArribaNombre(row.index, event.target.value)
                                            }
                                            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/15"
                                            placeholder="Nombre del colaborador"
                                          />
                                          {empleadosNombres.length > 0 && (
                                            <datalist id={`empleados-nombre-arriba-${row.index}`}>
                                              {empleadosNombres.map((nombre) => (
                                                <option key={`${row.index}-${nombre}`} value={nombre} />
                                              ))}
                                            </datalist>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => eliminarNombreArribaRow(row.index)}
                                            className="ml-auto px-2 py-1 rounded-lg border border-red-200/60 text-red-600 text-xs hover:bg-red-50 dark:border-red-400/40 dark:text-red-300"
                                          >
                                            Eliminar
                                          </button>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-6">
                                          {nombreArribaDias.map((dia) => {
                                            const dayKey = DAY_NAME_TO_KEY[dia];
                                            const diaRow = row.rowsPorDia[dia];
                                            const entrada = diaRow?.[dayKey]?.in ?? "";
                                            const salida = diaRow?.[dayKey]?.out ?? "";
                                            const defaults = DAY_DEFAULTS[dayKey];
                                            const entradaFuera = Boolean(entrada) && entrada !== defaults.in;
                                            const salidaFuera = Boolean(salida) && salida !== defaults.out;
                                            const baseInput =
                                              "w-full px-2 py-1 rounded-lg bg-white/80 dark:bg-white/10 text-center transition-colors";
                                            const normalBorder =
                                              "border border-petro-line/60 dark:border-white/15";
                                            const warnBorder =
                                              "border border-red-500 text-red-600 bg-red-50 dark:bg-red-500/10 dark:border-red-400/70 dark:text-red-100";
                                            return (
                                              <div
                                                key={`${dia}-${row.index}`}
                                                className="rounded-xl border border-petro-line/50 dark:border-white/15 bg-white/70 dark:bg-white/5 p-2 space-y-2"
                                              >
                                                <div className="text-xs font-semibold text-center uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                                  {dia}
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[10px] uppercase tracking-wide opacity-70">
                                                    Entrada
                                                  </label>
                                                  <input
                                                    value={entrada}
                                                    onChange={(event) =>
                                                      actualizarNombreArribaHorario(dia, row.index, "in", event.target.value)
                                                    }
                                                    className={`${baseInput} ${
                                                      entradaFuera ? warnBorder : normalBorder
                                                    }`}
                                                    placeholder={defaults.in}
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[10px] uppercase tracking-wide opacity-70">
                                                    Salida
                                                  </label>
                                                  <input
                                                    value={salida}
                                                    onChange={(event) =>
                                                      actualizarNombreArribaHorario(dia, row.index, "out", event.target.value)
                                                    }
                                                    className={`${baseInput} ${
                                                      salidaFuera ? warnBorder : normalBorder
                                                    }`}
                                                    placeholder={defaults.out}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                      {!!nombreArribaDias.length && (
                        <div className="rounded-2xl border border-petro-line/60 dark:border-white/10 bg-white/90 dark:bg-white/5 p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-petro-redDark dark:text-white">
                              Guarda día por día (semana típica)
                            </p>
                            <span className="text-xs font-semibold uppercase tracking-wide text-petro-ink/70 dark:text-white/70">
                              {savedDaysCount}/{totalDiasActivos} guardados
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {nombreArribaDias.map((dia) => {
                              const status = daySaveState[dia] ?? "idle";
                              const chipClass =
                                status === "saved"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100 dark:border-emerald-500/40"
                                  : status === "saving"
                                  ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-50 dark:border-amber-400/60"
                                  : "bg-white text-petro-ink border border-petro-line/60 dark:bg-white/10 dark:text-white";
                              return (
                                <span key={`chip-template-${dia}`} className={`px-3 py-1 rounded-full text-[11px] font-semibold ${chipClass}`}>
                                  {dia}: {DAY_STATUS_LABEL[status]}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {nombreArribaDias.map((dia) => {
                              const status = daySaveState[dia] ?? "idle";
                              const saving = status === "saving";
                              return (
                                <button
                                  key={`template-save-${dia}`}
                                  type="button"
                                  onClick={() => guardarCheckins(dia)}
                                  disabled={saving}
                                  className="px-3 py-1.5 rounded-xl border border-petro-line/60 text-xs font-semibold bg-white/90 hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white/10 dark:text-white dark:border-white/15"
                                >
                                  {saving ? `Guardando ${dia}...` : status === "saved" ? `Actualizar ${dia}` : `Guardar ${dia}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {diasActivos.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="rounded-2xl border border-petro-line/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-petro-redDark dark:text-white">Paso 1 · Guarda cada día</p>
                          <p className="text-xs opacity-70">Guarda la captura de cada día antes de cerrar la semana.</p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-petro-ink/70 dark:text-white/70">
                          {savedDaysCount}/{totalDiasActivos} guardados
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {diasActivos.map((dia) => {
                          const status = daySaveState[dia] ?? "idle";
                          const chipClass =
                            status === "saved"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-500/40"
                              : status === "saving"
                              ? "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-500/40"
                              : "bg-white text-petro-ink border border-petro-line/60 dark:bg-white/10 dark:text-white";
                          return (
                            <span key={`chip-${dia}`} className={`px-3 py-1 rounded-full text-xs font-semibold ${chipClass}`}>
                              {dia}: {DAY_STATUS_LABEL[status]}
                            </span>
                          );
                        })}
                      </div>
                      {isNombreArribaTemplate && (
                        <p className="text-xs opacity-70">
                          Estás usando la plantilla de semana típica. Guarda cada día desde la tarjeta superior del modo tabla.
                        </p>
                      )}
                      <p className="text-xs opacity-70">
                        Paso 2 · Cuando todos estén guardados, usa “Cerrar semana y generar nómina” para mandar los datos a Nóminas.
                      </p>
                    </div>
                  </div>
                )}
                {!isNombreArribaTemplate &&
                  (diasActivos.length === 0 ? (
                    <p className="opacity-70 text-sm px-4 pb-4">
                      No hay días agregados aún. Selecciona uno y pulsa “Agregar día”.
                    </p>
                  ) : (
                    diasActivos.map((dia) => {
                    const dayKey = DAY_NAME_TO_KEY[dia] ?? "LUN";
                    const normalizedDia = encodeURIComponent(dia.toLowerCase());
                    const dayStatus = daySaveState[dia] ?? "idle";
                    return (
                      <div
                      key={dia}
                      className="mb-8 rounded-2xl shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur"
                    >
                      <div className="flex justify-between items-center bg-gradient-to-r from-petro-red to-petro-redDark text-white px-4 py-2 rounded-t-2xl">
                        <h3 className="font-semibold">{dia}</h3>
                        <button
                          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm"
                          onClick={() => {
                            setDiasActivos((prev) => prev.filter((d) => d !== dia));
                            setCheckData((prev) => {
                              const copy = { ...prev };
                              delete copy[dia];
                              return copy;
                            });
                          }}
                        >
                          ✕ Eliminar día
                        </button>
                      </div>

                      {/* Tabla de empleados del día */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-petro-charcoal text-white">
                              <th className="px-3 py-2 text-left">Empleado</th>
                              <th className="px-3 py-2 text-center">Entrada</th>
                              <th className="px-3 py-2 text-center">Salida</th>
                              <th className="px-3 py-2 text-right">Horas</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {checkData[dia]?.map((r, idx) => {
                              const defaults = DAY_DEFAULTS[dayKey];
                              const entrada = r[dayKey].in;
                              const salida = r[dayKey].out;
                              const entradaDiff = Boolean(entrada) && entrada !== defaults.in;
                              const salidaDiff = Boolean(salida) && salida !== defaults.out;
                              const total = spanHours(entrada, salida);
                              const empleadosList = empleados.map((e) => e.nombre);
                              const baseInputClass =
                                "px-2 py-1 w-24 rounded-md bg-white/70 dark:bg-white/10 text-center transition-colors";
                              const normalBorder =
                                "border border-petro-line/60 dark:border-white/10";
                              const warnBorder =
                                "border border-red-500 text-red-600 bg-red-50 dark:bg-red-500/10 dark:border-red-400/70 dark:text-red-100";
                              return (
                                <tr
                                  key={idx}
                                  className="odd:bg-white/50 dark:odd:bg-white/5 even:bg-white/20 dark:even:bg-transparent"
                                >
                                  <td className="px-3 py-2">
                                    <input
                                      list={`empleados-${normalizedDia}-${idx}`}
                                      value={r.nombre}
                                      onChange={(e) => {
                                        setCheckData((prev) => {
                                          const rows = [...(prev[dia] || [])];
                                          const current = rows[idx];
                                          rows[idx] = { ...current, nombre: e.target.value };
                                          return { ...prev, [dia]: rows };
                                        });
                                      }}
                                      className="w-44 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                      placeholder="Empleado"
                                    />
                                    <datalist id={`empleados-${normalizedDia}-${idx}`}>
                                      {empleadosList.map((n) => (
                                        <option key={n} value={n} />
                                      ))}
                                    </datalist>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="time"
                                      value={r[dayKey].in}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setCheckData((prev) => {
                                          const rows = [...(prev[dia] || [])];
                                          const current = rows[idx];
                                          rows[idx] = {
                                            ...current,
                                            [dayKey]: { ...current[dayKey], in: value },
                                          };
                                          return { ...prev, [dia]: rows };
                                        });
                                      }}
                                      className={`${baseInputClass} ${
                                        entradaDiff ? warnBorder : normalBorder
                                      }`}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <input
                                      type="time"
                                      value={r[dayKey].out}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setCheckData((prev) => {
                                          const rows = [...(prev[dia] || [])];
                                          const current = rows[idx];
                                          rows[idx] = {
                                            ...current,
                                            [dayKey]: { ...current[dayKey], out: value },
                                          };
                                          return { ...prev, [dia]: rows };
                                        });
                                      }}
                                      className={`${baseInputClass} ${
                                        salidaDiff ? warnBorder : normalBorder
                                      }`}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{fmt(total)}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      onClick={() => {
                                        const nuevo = (checkData[dia] || []).filter((_, i) => i !== idx);
                                        setCheckData((p) => ({ ...p, [dia]: nuevo }));
                                      }}
                                      className="px-2 py-1 rounded-md bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Botón para agregar empleado al día */}
                      <div className="p-3 flex justify-end items-center gap-3">
                        <button
                          onClick={() => {
                            setCheckData((prev) => ({
                              ...prev,
                              [dia]: [...(prev[dia] || []), createEmptyCheckRow()],
                            }));
                          }}
                          className="px-3 py-1.5 rounded-xl bg-petro-red text-white text-sm"
                        >
                          + Agregar empleado
                        </button>
                        <button
                          onClick={() => guardarCheckins(dia)}
                          disabled={dayStatus === "saving"}
                          className="ml-3 px-4 py-2 rounded-xl bg-green-600 text-white text-sm shadow hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {dayStatus === "saving"
                            ? `Guardando ${dia}...`
                            : dayStatus === "saved"
                            ? `Actualizar ${dia}`
                            : `💾 Guardar ${dia}`}
                        </button>
                      </div>
                    </div>
                    );
                  })
                ))}
                <button
                  className="mt-3 px-4 py-2 rounded-xl bg-green-600 text-white text-sm shadow hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!canCloseWeek}
                  onClick={async () => {
                    try {
                      const semana = semanaCheckin.trim();
                      if (!semana) {
                        showAlert("Indica el nombre de la semana antes de cerrar.", "warning");
                        return;
                      }
                      const semanaNominaFinal = (semanaNomina || "").trim() || semana;
                      const resumen = await closeCheckinWeek(semana);
                      await cargarHistorial(true);

                      const payload = crearNominaDesdeResumen(resumen, semanaNominaFinal);

                      if (!payload.empleados.length) {
                        showAlert(
                          `⚠️ Semana "${resumen.semana}" cerrada, pero no se encontraron empleados para generar nómina automática.`,
                          "warning"
                        );
                        return;
                      }

                      await createNomina(payload);
                      await refrescarNominas();
                      setSection("nominas");
                      const semanaFinal = payload.semana.trim();
                      setSectionTitle(semanaFinal);
                      setSemanaCheckin(semanaFinal);
                      setSemanaNominaTouched(false);
                      setSemanaNomina(semanaFinal);
                      showAlert(
                        [
                          `✅ ${resumen.message}`,
                          `Registros de check-in: ${resumen.totalRegistros}`,
                          `Empleados en nómina: ${payload.empleados.length}`,
                          `Total estimado: $${fmt(payload.totalGeneral)}`,
                        ].join("\n"),
                        "success"
                      );
                    } catch (err) {
                      console.error("❌ Error al cerrar semana:", err);
                      const message = err instanceof Error ? err.message : "No se pudo cerrar la semana.";
                      showAlert(`No se pudo cerrar la semana. ${message}`, "error");
                    }
                  }}
                >
                  🧾 Cerrar semana y generar nómina
                </button>
                {!canCloseWeek && (
                  <p className="mt-1 text-xs opacity-70">
                    Guarda todos los días activos antes de cerrar la semana.
                  </p>
                )}
                {canCloseWeek && (
                  <p className="mt-1 text-xs opacity-70 text-emerald-700 dark:text-emerald-300">
                    Listo. Puedes mandar la semana a Nóminas cuando lo necesites.
                  </p>
                )}
                {resumenBonosSemana.length > 0 && (
                  <div className="mt-6 rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-petro-redDark dark:text-petro-redLight">
                          Bonos calculados con la semana en captura
                        </h3>
                        <p className="text-xs opacity-70">
                          ✓ Bono semanal: {BONUS_WEEKLY_HOURS} h = ${BONUS_WEEKLY_AMOUNT}. Bono mensual: {BONUS_MONTHLY_STREAK} semanas continuas = ${BONUS_MONTHLY_AMOUNT}.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                            <th className="px-3 py-2 text-left">Empleado</th>
                            <th className="px-3 py-2 text-right whitespace-nowrap">Horas semana</th>
                            <th className="px-3 py-2 text-center">Bono semanal</th>
                            <th className="px-3 py-2 text-center">Bono mensual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumenBonosSemana.map((row) => {
                            const manualKey = normalizarNombre(row.nombre);
                            const manualFlags = manualBonos[manualKey];
                            const manualSemanal = manualFlags?.semanal ?? false;
                            const manualMensual = manualFlags?.mensual ?? false;
                            return (
                              <tr
                                key={row.nombre}
                                className="odd:bg-white/70 dark:odd:bg-white/10 even:bg-white/40 dark:even:bg-transparent"
                              >
                                <td className="px-3 py-2">{row.nombre}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(row.horas)}</td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <span
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-base ${
                                        row.semanal
                                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-600"
                                          : "border-petro-line/60 text-slate-400 dark:border-white/15"
                                      }`}
                                      title={
                                        row.semanal
                                          ? `Cumple con ${BONUS_WEEKLY_HOURS} h y recibe $${BONUS_WEEKLY_AMOUNT}`
                                          : `Requiere ${BONUS_WEEKLY_HOURS} h para bono semanal`
                                      }
                                    >
                                      {row.semanal ? "✓" : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleManualBono(row.nombre, "semanal")}
                                      className="flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-petro-redDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petro-redDark dark:text-slate-200"
                                      title="Marcar o quitar la palomita semanal manualmente"
                                      aria-pressed={manualSemanal}
                                    >
                                      <span
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-base ${
                                          manualSemanal
                                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-600 dark:border-indigo-300 dark:text-indigo-200"
                                            : "border-petro-line/60 text-slate-400 dark:border-white/15"
                                        }`}
                                      >
                                        {manualSemanal ? "✓" : ""}
                                      </span>
                                      <span>Manual</span>
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <span
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-base ${
                                        row.mensual
                                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-600"
                                          : "border-petro-line/60 text-slate-400 dark:border-white/15"
                                      }`}
                                      title={
                                        row.mensual
                                          ? `Acumula ${BONUS_MONTHLY_STREAK} semanas consecutivas de ${BONUS_WEEKLY_HOURS} h`
                                          : `Necesita ${BONUS_MONTHLY_STREAK} semanas consecutivas con ${BONUS_WEEKLY_HOURS} h`
                                      }
                                    >
                                      {row.mensual ? "✓" : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleManualBono(row.nombre, "mensual")}
                                      className="flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-petro-redDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petro-redDark dark:text-slate-200"
                                      title="Marcar o quitar la palomita mensual manualmente"
                                      aria-pressed={manualMensual}
                                    >
                                      <span
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-base ${
                                          manualMensual
                                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-600 dark:border-indigo-300 dark:text-indigo-200"
                                            : "border-petro-line/60 text-slate-400 dark:border-white/15"
                                        }`}
                                      >
                                        {manualMensual ? "✓" : ""}
                                      </span>
                                      <span>Manual</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-base md:text-lg">Historial de días registrados</h3>
                <div className="flex items-center gap-2">
                  {historialCargando && (
                    <span className="text-sm opacity-70 animate-pulse">Actualizando…</span>
                  )}
                  <button
                    onClick={() => cargarHistorial(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm disabled:opacity-50"
                    disabled={historialCargando}
                  >
                    🔄 Actualizar
                  </button>
                </div>
              </div>
              {historialError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  Error al cargar historial: {historialError}
                </p>
              ) : historialDias.length === 0 ? (
                <p className="mt-3 text-sm opacity-70">Aún no hay check-ins registrados.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left bg-petro-charcoal text-white">
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Día</th>
                        <th className="px-3 py-2">Semana</th>
                        <th className="px-3 py-2 text-right">Registros</th>
                        <th className="px-3 py-2">Empleados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialDias.slice(0, HISTORIAL_MAX_FILAS).map((entry) => (
                        <tr
                          key={entry.key}
                          className="border-b border-petro-line/40 last:border-0 dark:border-white/10 odd:bg-white/60 dark:odd:bg-white/5 even:bg-white/30 dark:even:bg-transparent"
                        >
                          <td className="px-3 py-2">{entry.fechaLabel}</td>
                          <td className="px-3 py-2">{entry.dia}</td>
                          <td className="px-3 py-2">{entry.semana || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{entry.total}</td>
                          <td className="px-3 py-2">{resumirNombres(entry.nombres)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {/* ─────────────── NÓMINAS ─────────────── */}
          {section === "nominas" && (
            <>
              {/* TOOLBAR */}
              <div className="rounded-2xl p-5 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-petro-ink/60 dark:text-white/60">
                      Explorador de nóminas
                    </p>
                    <h2 className="text-lg font-semibold text-petro-redDark dark:text-white">
                      Filtra y enfócate antes de editar
                    </h2>
                    <p className="text-sm text-petro-ink/70 dark:text-white/70">
                      Ajusta los selectores en segundos y evita tocar columnas equivocadas.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-petro-ink/70 dark:text-white/60">
                    <span className="inline-flex items-center gap-2 rounded-full border border-petro-line/70 px-3 py-1 bg-white/60 dark:bg-white/10 dark:border-white/15">
                      Semana foco: {sectionTitle || "Sin semana"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-petro-line/70 px-3 py-1 bg-white/60 dark:bg-white/10 dark:border-white/15">
                      Columnas totales: {columns.length}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-petro-line/70 px-3 py-1 bg-white/60 dark:bg-white/10 dark:border-white/15">
                      Numéricas: {numericCols.length}
                    </span>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-petro-ink/80 dark:text-white/80">
                    Buscar en todo
                    <input
                      className="px-3 py-2 rounded-xl border border-petro-line/60 dark:border-white/10 bg-white text-sm text-petro-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-petro-red/40 dark:bg-white/5 dark:text-white"
                      placeholder="Nombre, puesto o semana…"
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setPage(0);
                      }}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-petro-ink/80 dark:text-white/80">
                    Columna de nombre
                    <select
                      className="px-3 py-2 rounded-xl border border-petro-line/60 dark:border-white/10 bg-white text-sm dark:bg-white/5 dark:text-white"
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                    >
                      <option value="">Detectar automáticamente…</option>
                      {textCols.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] font-normal text-petro-ink/60 dark:text-white/60">
                      Texto detectado: {textCols.length}
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-petro-ink/80 dark:text-white/80">
                    Columna de monto
                    <select
                      className="px-3 py-2 rounded-xl border border-petro-line/60 dark:border-white/10 bg-white text-sm dark:bg-white/5 dark:text-white"
                      value={amountCol}
                      onChange={(e) => setAmountCol(e.target.value)}
                    >
                      <option value="">Detectar automáticamente…</option>
                      {numericCols.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] font-normal text-petro-ink/60 dark:text-white/60">
                      Números detectados: {numericCols.length}
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-xs font-semibold text-petro-ink/80 dark:text-white/80">
                    Periodo
                    <select
                      className="px-3 py-2 rounded-xl border border-petro-line/60 dark:border-white/10 bg-white text-sm disabled:opacity-50 dark:bg-white/5 dark:text-white"
                      value={periodo}
                      onChange={(e) => {
                        setPeriodo(e.target.value);
                        setPage(0);
                      }}
                      disabled={!periodoCol}
                      title={
                        periodoCol
                          ? `Usando columna: ${periodoCol}`
                          : "No se detectó columna de periodo"
                      }
                    >
                      <option value="">
                        {periodoCol ? "Todos los periodos" : "Sin columna de periodo"}
                      </option>
                      {periodosUnicos.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] font-normal text-petro-ink/60 dark:text-white/60">
                      {periodoCol ? `Columna: ${periodoCol}` : "Activa un periodo desde la hoja"}
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs text-petro-ink/70 dark:text-white/70">
                    <span className="inline-flex items-center gap-2 rounded-full border border-petro-line/70 px-3 py-1 bg-white/60 dark:bg-white/10 dark:border-white/15">
                      Periodo activo: {periodo || "Todos"}
                    </span>
                    {periodoCol && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-petro-line/70 px-3 py-1 bg-white/60 dark:bg-white/10 dark:border-white/15">
                        Columna periodo: {periodoCol}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-4 py-2 rounded-xl bg-white/90 dark:bg-white/10 border border-petro-line/60 dark:border-white/15 hover:bg-white text-sm"
                      onClick={abrirModalDescuento}
                    >
                      Descontar préstamo
                    </button>
                    <button
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white shadow hover:shadow-lg active:scale-[0.98] transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => {
                        const csv = toCSV(datosPeriodo);
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = periodo ? `nominas_${periodo}.csv` : "nominas_todos.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      disabled={!datosPeriodo.length}
                    >
                      Exportar CSV
                    </button>
                  </div>
                </div>
              </div>


              {/* MÉTRICAS – TARJETAS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <MetricCard title={`Registros${periodo ? ` · ${periodo}` : ""}`} value={totalRegistros.toLocaleString()} from="from-petro-red" to="to-petro-redDark" />
                <MetricCard title="Empleados únicos" value={empleadosUnicos.toLocaleString()} from="from-petro-charcoal" to="to-petro-ink" />
                <MetricCard title={`Suma (${amountCol || "monto"})`} value={fmt(sumaMontos)} from="from-petro-redLight" to="to-petro-red" />
                <MetricCard title="Hojas" value={hojasUnicas.toLocaleString()} from="from-petro-ink" to="to-petro-charcoal" />
              </section>

              {/* TABLA + TOP */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tabla */}
                <div className="order-2 lg:order-1 lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-base font-semibold text-petro-redDark dark:text-white">
                        Tabla completa de nóminas
                      </h2>
                      <p className="text-xs opacity-70">
                        Incluye semana, nombre, bonos, comisiones, costos por hora y totales (fechas ocultas).
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-petro-line/60 bg-white/80 text-petro-ink hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/10 dark:text-white"
                      onClick={() => setShowNominasTable((open) => !open)}
                      disabled={!tablaNominasDisponible}
                      aria-expanded={showNominasTable}
                    >
                      {showNominasTable ? "Ocultar tabla" : "Ver tabla completa"}
                    </button>
                  </div>
                  {rawData.length === 0 ? (
                    <p className="text-sm opacity-70">
                      Cargando datos… asegúrate de tener <code>public/nominas_merged_clean.json</code>
                    </p>
                  ) : !showNominasTable ? (
                    <p className="text-sm opacity-70">
                      Presiona "Ver tabla completa" para revisar la semana, nombre, bonos y totales antes de exportar.
                    </p>
                  ) : (
                    <>
                      <div className="overflow-auto rounded-2xl shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0">
                            <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                              {visibleCols.map((col) => (
                                <th key={col} className="px-3 py-2 text-left font-medium">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sliced.map((row, i) => (
                              <tr
                                key={i}
                                className={`${i % 2 ? "bg-white/70 dark:bg-white/5" : "bg-white/40 dark:bg-white/0"} hover:bg-petro-off/80 dark:hover:bg-white/10 transition`}
                              >
                                {visibleCols.map((col) => (
                                  <td key={col} className="px-3 py-2">
                                    {String(row[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginación + título debajo */}
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs opacity-70">
                            {datosPeriodo.length.toLocaleString()} filas · página {page + 1} de {totalPages}
                          </span>
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                              onClick={() => setPage((p) => Math.max(0, p - 1))}
                            >
                              Anterior
                            </button>
                            <button
                              className="px-3 py-1 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>

                        {sectionTitle && (
                          <div className="text-center">
                            <div className="inline-block px-3 py-1 rounded-lg bg-white/70 dark:bg-white/10 ring-1 ring-petro-line/60 dark:ring-white/10 text-sm font-semibold">
                              {sectionTitle}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Top 5 */}
                <div className="order-1 lg:order-2 rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="font-semibold">
                      Top 5 por total ({amountCol || "monto"})
                      {periodo ? ` · ${periodo}` : ""}
                    </h2>
                    <button
                      type="button"
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-petro-line/60 bg-white/80 text-petro-ink hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/10 dark:text-white"
                      onClick={() => setShowTopTotales((open) => !open)}
                      disabled={!topPanelAvailable}
                      aria-expanded={showTopTotales}
                    >
                      {showTopTotales ? "Ocultar" : "Ver Top 5"}
                    </button>
                  </div>
                  {!nameCol || !amountCol ? (
                    <p className="text-sm opacity-70">Selecciona columnas de nombre y monto.</p>
                  ) : topTotales.length === 0 ? (
                    <p className="text-sm opacity-70">Sin datos.</p>
                  ) : !showTopTotales ? (
                    <p className="text-sm opacity-70">Presiona "Ver Top 5" para abrir el detalle.</p>
                  ) : (
                    <ul className="space-y-2">
                      {topTotales.map((t, idx) => {
                        const pct = maxTop > 0 ? Math.max(2, (t.total / maxTop) * 100) : 0;
                        return (
                          <li key={idx}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="truncate pr-2">{t.name}</span>
                              <span className="font-mono">{fmt(t.total)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-petro-line/50 dark:bg-white/10">
                              <div className="h-2 rounded-full bg-gradient-to-r from-petro-red to-petro-redDark" style={{ width: `${pct}%` }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>

              <section className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/85 text-petro-ink dark:bg-[#161616] dark:text-gray-100 backdrop-blur space-y-4">
                <header className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-petro-redDark dark:text-white">Historial de nóminas guardadas</h2>
                    <p className="text-sm opacity-70 text-petro-ink/70 dark:text-white/70">Revisa los empleados capturados en cada semana.</p>
                  </div>
                  <span className="text-xs opacity-60 text-petro-ink/70 dark:text-white/60">
                    {nominasFiltradas.length.toLocaleString()} semanas listadas
                  </span>
                </header>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <input
                    className="px-3 py-2 w-full md:w-72 rounded-xl bg-white border border-petro-line/50 text-sm text-petro-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-petro-red/30 dark:bg-white/10 dark:border-white/15 dark:text-white dark:placeholder:text-white/40 dark:focus:ring-white/40"
                    placeholder="Filtrar por semana o empleado…"
                    value={filtroHistorialNominas}
                    onChange={(e) => setFiltroHistorialNominas(e.target.value)}
                  />
                  {filtroHistorialNominas && (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-petro-line/30 border border-petro-line/60 text-xs text-petro-ink dark:bg-white/10 dark:border-white/20 dark:text-white"
                      onClick={() => setFiltroHistorialNominas("")}
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>
                {nominasGuardadas.length === 0 ? (
                  <p className="text-sm opacity-70 text-petro-ink/70 dark:text-white/70">Aún no has guardado nóminas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full bg-petro-line/30 text-petro-ink px-3 py-1 font-medium dark:bg-white/10 dark:text-white">
                        Empleados únicos en historial: {empleadosHistorialNominas.length}
                      </span>
                      {empleadosHistorialNominas.length > 0 && (
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto text-[11px] text-petro-ink dark:text-white/80">
                          {empleadosHistorialNominas.map((nombre) => (
                            <span
                              key={nombre}
                              className="inline-flex items-center rounded-full border border-petro-line/60 px-2 py-[2px] text-petro-ink dark:border-white/20 dark:text-white/80"
                            >
                              {nombre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <table className="w-full border-collapse text-sm bg-white rounded-xl overflow-hidden min-w-[760px] text-petro-ink dark:bg-[#1b1b1b] dark:text-gray-100">
                      <thead>
                        <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                          <th className="p-2 text-left">Semana</th>
                          <th className="p-2 text-left">Empleados</th>
                          <th className="p-2 text-right">Descuento</th>
                          <th className="p-2 text-center">Total general</th>
                          <th className="p-2 text-left">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nominasFiltradas.map((nomina, index) => {
                          const totalDescuento = (nomina.empleados ?? []).reduce(
                            (acc, emp) => acc + safeNumber(emp.descuentos),
                            0
                          );
                          const totalPendiente = (nomina.empleados ?? []).reduce(
                            (acc, emp) => acc + safeNumber(emp.pendiente_descuento),
                            0
                          );
                          const netoEstimado = round2(safeNumber(nomina.totalGeneral) - totalDescuento);
                          return (
                            <tr
                              key={index}
                              className="border-t border-petro-line/40 hover:bg-petro-line/20 dark:border-gray-700 dark:hover:bg-[#2b2b2b]"
                            >
                              <td className="p-2 font-semibold text-petro-redDark dark:text-white">
                                {nomina.semana}
                              </td>

                              <td className="p-2">
                                <div className="flex flex-col gap-1.5">
                                  <div className="text-xs text-petro-ink/70 dark:text-white/60">
                                    {nomina.empleados.length > 0
                                      ? resumirNombres(
                                          nomina.empleados
                                            .map((emp) => String(emp.nombre ?? "").trim())
                                            .filter(Boolean)
                                        )
                                      : "Sin empleados registrados"}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => setDetalleNomina(nomina)}
                                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs md:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                      disabled={nomina.empleados.length === 0}
                                    >
                                      👁️ Ver detalles
                                    </button>
                                    <button
                                      onClick={() => abrirEditorNominaSemanaObjetivo(nomina)}
                                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs transition disabled:opacity-60 disabled:cursor-not-allowed"
                                      disabled={nomina.empleados.length === 0}
                                    >
                                      ✏️ Editar semana
                                    </button>
                                    <button
                                      onClick={() => eliminarNominaSemana(nomina.semana ?? "")}
                                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs transition disabled:opacity-60 disabled:cursor-not-allowed"
                                      disabled={
                                        deleteNominaLoading &&
                                        deleteSemanaTarget === (nomina.semana ?? "")
                                      }
                                    >
                                      {deleteNominaLoading &&
                                      deleteSemanaTarget === (nomina.semana ?? "")
                                        ? "Eliminando…"
                                        : "🗑️ Eliminar"}
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td className="p-2 text-right">
                                {totalDescuento > 0 ? (
                                  <div className="inline-flex flex-col items-end rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 border border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                    <span>-${fmt(totalDescuento)}</span>
                                    {totalPendiente > 0 && (
                                      <span className="text-[11px] opacity-80">
                                        Pendiente ${fmt(totalPendiente)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs opacity-50">—</span>
                                )}
                              </td>
                              <td className="p-2 text-center font-bold text-green-600 dark:text-green-400">
                                <div className="flex flex-col items-center">
                                  <span>${fmt(nomina.totalGeneral)}</span>
                                  {totalDescuento > 0 && (
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-200">
                                      Neto: ${fmt(netoEstimado)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-petro-ink/70 dark:text-gray-400">
                                {(() => {
                                  const fecha = nomina.fechaRegistro || nomina.createdAt;
                                  return fecha ? new Date(fecha).toLocaleDateString() : "Sin fecha";
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              {editNominaSemana && (
                <>
                  <div
                    className="fixed inset-0 z-[82] bg-black/65 backdrop-blur-sm"
                    onClick={cerrarEditorNomina}
                    aria-hidden="true"
                  />
                  <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-8">
                    <div className="w-full max-w-5xl rounded-3xl shadow-2xl ring-1 ring-white/10 bg-[#0F1116]/95 text-white overflow-hidden">
                      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
                        <div>
                          <h3 className="text-xl font-semibold">
                            Editar nómina · {editNominaSemana}
                          </h3>
                          <p className="text-xs text-white/60">
                            Ajusta montos finales, bonos y descuentos para cada colaborador.
                          </p>
                        </div>
                        <button
                          onClick={cerrarEditorNomina}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
                        >
                          Cerrar
                        </button>
                      </header>

                      <div className="px-6 py-3 flex flex-wrap gap-3 text-xs sm:text-sm text-white/80">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                          Total original: <strong className="font-mono text-white">{fmt(editNominaTotalOriginal)}</strong>
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                          Total con cambios:{" "}
                          <strong className="font-mono text-green-300">
                            {fmt(editNominaTotalPreview)}
                          </strong>
                        </span>
                      </div>

                      <div className="px-6 pb-4 max-h-[60vh] overflow-auto">
                        {editNominaRows.length === 0 ? (
                          <p className="text-sm text-white/60">
                            No se encontraron empleados para esta semana.
                          </p>
                        ) : (
                          <table className="w-full text-xs sm:text-sm border-collapse min-w-[720px]">
                            <thead>
                              <tr className="bg-[#1D2331] text-white uppercase text-[11px] tracking-wide">
                                <th className="px-3 py-2 text-left">Empleado</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Pago semanal</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Bono semanal</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Bono mensual</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Comisión</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Descuentos</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Pendiente</th>
                                <th className="px-3 py-2 text-right whitespace-nowrap">Total final</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editNominaRows.map((row, index) => (
                                <tr
                                  key={row._id ?? `${row.nombre}-${index}`}
                                  className={index % 2 === 0 ? "bg-white/5" : "bg-white/10"}
                                >
                                  <td className="px-3 py-2 font-semibold text-white/90">
                                    {row.nombre || "Sin nombre"}
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/50"
                                      value={row.pago_semanal_calc}
                                      onChange={(event) =>
                                        actualizarFilaNomina(index, "pago_semanal_calc", event.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/50"
                                      value={row.bono_semanal}
                                      onChange={(event) =>
                                        actualizarFilaNomina(index, "bono_semanal", event.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/50"
                                      value={row.bono_mensual}
                                      onChange={(event) =>
                                        actualizarFilaNomina(index, "bono_mensual", event.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/50"
                                      value={row.comision}
                                      onChange={(event) =>
                                        actualizarFilaNomina(index, "comision", event.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/50"
                                      value={row.descuentos}
                                      onChange={(event) =>
                                        actualizarFilaNomina(index, "descuentos", event.target.value)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-white/50"
                                      value={row.pendiente_descuento}
                                      onChange={(event) =>
                                        actualizarFilaNomina(
                                          index,
                                          "pendiente_descuento",
                                          event.target.value
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-green-400"
                                      value={row.total_final}
                                      onChange={(event) =>
                                        actualizarFilaNomina(index, "total_final", event.target.value)
                                      }
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-white/10">
                        <p className="text-xs text-white/60">
                          Los cambios se guardan para todos los empleados de la semana seleccionada.
                        </p>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={cerrarEditorNomina}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={guardarEdicionNominaSemana}
                            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={editNominaSaving || editNominaRows.length === 0}
                          >
                            {editNominaSaving ? "Guardando…" : "Guardar cambios"}
                          </button>
                        </div>
                      </footer>
                    </div>
                  </div>
                </>
              )}
              {descuentoModalOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
                    onClick={cerrarModalDescuento}
                    aria-hidden="true"
                  />
                  <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-8">
                    <div className="w-full max-w-3xl rounded-3xl shadow-2xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/95 dark:bg-[#0b1020]/95 overflow-hidden">
                      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-petro-line/40 dark:border-white/15">
                        <div>
                          <h3 className="text-lg font-semibold text-petro-redDark dark:text-petro-redLight">
                            Descontar préstamo de nómina
                          </h3>
                          <p className="text-xs opacity-70">
                            Actualiza el descuento y el faltante de una nómina ya registrada.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white text-sm"
                          onClick={cerrarModalDescuento}
                        >
                          Cerrar
                        </button>
                      </header>
                      <form
                        className="px-6 py-5 space-y-5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          guardarDescuentoNomina();
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="space-y-1 text-sm">
                            <span className="font-medium">Semana</span>
                            <select
                              className="w-full rounded-xl px-3 py-2 bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                              value={semanaObjetivo}
                              onChange={(e) => setSemanaObjetivo(e.target.value)}
                            >
                              <option value="">Selecciona semana…</option>
                              {semanasDisponiblesNomina.map((sem) => (
                                <option key={sem} value={sem}>
                                  {sem}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium">Empleado</span>
                            <select
                              className="w-full rounded-xl px-3 py-2 bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 disabled:opacity-50"
                              value={nominaObjetivoId}
                              onChange={(e) => seleccionarNomina(e.target.value)}
                              disabled={!semanaObjetivo || nominasSemanaSeleccionada.length === 0}
                            >
                              <option value="">Selecciona empleado…</option>
                              {nominasSemanaSeleccionada.map((nomina) => (
                                <option key={nomina._id} value={nomina._id}>
                                  {nomina.nombre} · ${fmt(safeNumber(nomina.total_final ?? nomina.pago_semanal_calc ?? 0))}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {!semanasDisponiblesNomina.length && (
                          <p className="text-sm opacity-70">
                            No se encontraron nóminas registradas. Guarda una nómina antes de aplicar descuentos.
                          </p>
                        )}

                        {semanaObjetivo && nominasSemanaSeleccionada.length === 0 && (
                          <p className="text-sm opacity-70">
                            Esta semana no tiene empleados registrados en la base de datos.
                          </p>
                        )}

                        {registroNominaSeleccionado ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-petro-line/40 dark:border-white/10 bg-white/60 dark:bg-white/5 px-4 py-3 text-sm">
                              <div>
                                <span className="font-medium block">Pago base registrado</span>
                                <span className="font-mono text-lg">{fmt(pagoBaseNomina)}</span>
                              </div>
                              <div>
                                <span className="font-medium block">Descuento actual</span>
                                <span className="font-mono">{fmt(descuentoAnterior)}</span>
                              </div>
                              <div>
                                <span className="font-medium block">Pendiente actual</span>
                                <span className="font-mono">{fmt(pendienteAnterior)}</span>
                              </div>
                              <div>
                                <span className="font-medium block">Total estimado con descuento</span>
                                <span className="font-mono text-lg text-petro-redDark dark:text-petro-redLight">
                                  {fmt(nuevoTotalEstimado)}
                                </span>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-dashed border-petro-line/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-petro-redDark dark:text-petro-redLight">
                                    Préstamos registrados en Equipo
                                  </p>
                                  <p className="text-xs opacity-70">
                                    Usa alguno para rellenar el descuento automáticamente.
                                  </p>
                                </div>
                                {prestamosEmpleadoSeleccionado.length > 0 && (
                                  <span className="text-xs font-semibold uppercase tracking-wide text-petro-ink/70 dark:text-white/70">
                                    Total: ${fmt(totalPrestamosEmpleado)}
                                  </span>
                                )}
                              </div>
                              {loadingPrestamos ? (
                                <p className="mt-2 text-xs opacity-70">Cargando préstamos…</p>
                              ) : prestamosEmpleadoSeleccionado.length === 0 ? (
                                <p className="mt-2 text-xs opacity-70">
                                  Este colaborador no tiene préstamos capturados en la sección Equipo.
                                </p>
                              ) : (
                                <ul className="mt-3 space-y-2 max-h-44 overflow-auto pr-1">
                                  {prestamosEmpleadoSeleccionado.map((p) => (
                                    <li
                                      key={p._id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-petro-line/40 dark:border-white/10 bg-white/90 dark:bg-white/5 px-3 py-2"
                                    >
                                      <div>
                                        <p className="font-semibold text-sm text-petro-redDark dark:text-white">
                                          ${fmt(p.monto)}
                                        </p>
                                        <p className="text-xs opacity-70">
                                          {(p.descripcion || "Sin descripción").slice(0, 120)}
                                        </p>
                                        <p className="text-[11px] opacity-60">
                                          {p.fechaISO ? new Date(p.fechaISO).toLocaleDateString() : "Sin fecha"}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-petro-red to-petro-redDark text-white text-xs shadow hover:shadow-md"
                                        onClick={() => usarPrestamoEnFormulario(p.monto)}
                                      >
                                        Usar monto
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm opacity-70">
                            Selecciona un empleado para revisar el detalle de la nómina guardada.
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="space-y-1 text-sm">
                            <span className="font-medium">Descuento a aplicar</span>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full rounded-xl px-3 py-2 bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                              value={descuentoValor}
                              onChange={(e) => setDescuentoValor(e.target.value)}
                              placeholder="Ej. 500"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="font-medium flex items-center justify-between">
                              Faltante del préstamo
                              {registroNominaSeleccionado && (
                                <button
                                  type="button"
                                  className="ml-2 px-2 py-1 rounded-md border border-petro-line/60 dark:border-white/10 bg-white/80 dark:bg-white/10 text-xs"
                                  onClick={() => {
                                    const restante = Math.max(
                                      0,
                                      pendienteAnterior -
                                        (Number.isFinite(descuentoPropuesto) ? descuentoPropuesto : 0)
                                    );
                                    setPendienteValor(String(round2(restante)));
                                  }}
                                >
                                  Calcular restante
                                </button>
                              )}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full rounded-xl px-3 py-2 bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                              value={pendienteValor}
                              onChange={(e) => setPendienteValor(e.target.value)}
                              placeholder="Ej. 1200"
                            />
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                            onClick={cerrarModalDescuento}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={!nominaObjetivoId || guardandoDescuento}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {guardandoDescuento ? "Guardando…" : "Guardar cambios"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ─────────────── EMPLEADOS ─────────────── */}
          {section === "empleados" && (
            <div className="space-y-4">
              {/* Barra de acciones */}
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={agregarEmpleado}
                  disabled={loadingEmpleados}
                >
                  + Nuevo empleado
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 text-sm"
                  onClick={() => {
                    const csv = toCSV(
                      empleados.map((e) => ({
                        id: e._id,
                        nombre: e.nombre,
                        puesto: e.puesto,
                        area: e.area,
                        direccion: e.direccion,
                        telefono: e.telefono,
                        rfc: e.rfc,
                        curp: e.curp,
                        estatus: e.estatus,
                        tarifa: e.tarifa,
                        extraX: e.extraX,
                        tipoPago: e.tipoPago,
                        pagoSemanal: e.pagoSemanal,
                      }))
                    );
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "empleados.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Exportar CSV
                </button>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur overflow-hidden">
                  <div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-petro-red/50 scrollbar-track-transparent hover:scrollbar-thumb-petro-red/80 overscroll-x-contain">
                    <table className="w-full min-w-[960px] text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2">Tipo pago</th>
                          <th className="px-3 py-2 text-right">Pago semanal</th>
                          <th className="px-3 py-2">Puesto</th>
                          <th className="px-3 py-2">Área</th>
                          <th className="px-3 py-2">Estatus</th>
                          <th className="px-3 py-2 text-right">$/h</th>
                          <th className="px-3 py-2 text-right">Extra×</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingEmpleados ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-6 text-center opacity-70">
                              Cargando empleados...
                            </td>
                          </tr>
                        ) : empleados.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-6 text-center opacity-70">
                              Sin empleados. Agrega uno con “+ Nuevo empleado”.
                            </td>
                          </tr>
                        ) : (
                          empleados.map((emp, idx) => (
                            <tr
                              key={emp._id}
                              className={idx % 2 ? "bg-white/70 dark:bg-white/5" : "bg-white/40 dark:bg-transparent"}
                            >
                              <td className="px-3 py-2">
                                <input
                                  className="w-full px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.nombre}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x._id === emp._id ? { ...x, nombre: e.target.value } : x))
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                  placeholder="Nombre"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <select
                                  className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.tipoPago}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) =>
                                        x._id === emp._id ? { ...x, tipoPago: e.target.value as TipoPago } : x
                                      )
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                >
                                  <option value="Por horas">Por horas</option>
                                  <option value="Semanal fijo">Semanal fijo</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.pagoSemanal}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) =>
                                        x._id === emp._id ? { ...x, pagoSemanal: Number(e.target.value) } : x
                                      )
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  className="w-36 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-center"
                                  value={emp.puesto}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x._id === emp._id ? { ...x, puesto: e.target.value } : x))
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  className="w-28 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-center"
                                  value={emp.area}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x._id === emp._id ? { ...x, area: e.target.value } : x))
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <select
                                  className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.estatus}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) =>
                                        x._id === emp._id ? { ...x, estatus: e.target.value as Estatus } : x
                                      )
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                >
                                  <option value="Activo">Activo</option>
                                  <option value="Baja">Baja</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-24 text-right px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.tarifa}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x._id === emp._id ? { ...x, tarifa: Number(e.target.value) } : x))
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-20 text-right px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.extraX}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x._id === emp._id ? { ...x, extraX: Number(e.target.value) } : x))
                                    )
                                  }
                                  onBlur={() => guardarEmpleado(emp)}
                                />
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  <button
                                    className="px-2 py-1 rounded-lg bg-blue-500/90 hover:bg-blue-500 text-white text-xs"
                                    onClick={() => abrirExtrasEmpleado(emp)}
                                    title="Ver datos extra"
                                    aria-label="Ver datos extra"
                                    type="button"
                                  >
                                    📋 Extras
                                  </button>
                                  <button
                                    className="px-2 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-xs"
                                    onClick={() => {
                                      const monto = Number(prompt("Monto del préstamo:", "0"));
                                      if (!monto || isNaN(monto)) return;
                                      const descripcion = prompt("Descripción o motivo:", "") || "";
                                      agregarPrestamo(emp._id, monto, descripcion);
                                    }}
                                    title="Registrar préstamo"
                                    aria-label="Registrar préstamo"
                                    type="button"
                                  >
                                    💵 Préstamo
                                  </button>
                                  <button
                                    className="px-2 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-xs"
                                    onClick={() => borrarEmpleado(emp._id)}
                                    title="Eliminar empleado"
                                    aria-label="Eliminar empleado"
                                    type="button"
                                  >
                                    🗑️ Borrar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                  <h3 className="font-semibold mb-3 text-petro-redDark">Historial de préstamos</h3>
                  <div className="overflow-auto rounded-xl border border-petro-line/60 dark:border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                          <th className="px-3 py-2 text-left">Empleado</th>
                          <th className="px-3 py-2 text-right">Monto</th>
                          <th className="px-3 py-2">Descripción</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingPrestamos ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center opacity-70">
                              Cargando préstamos...
                            </td>
                          </tr>
                        ) : prestamos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center opacity-70">
                              Sin préstamos registrados.
                            </td>
                          </tr>
                        ) : (
                          prestamos.map((p) => {
                            const emp = empleados.find((e) => e._id === p.empleadoId);
                            return (
                              <tr key={p._id} className="even:bg-white/60 dark:even:bg-white/5">
                                <td className="px-3 py-2">{emp?.nombre ?? "Desconocido"}</td>
                                <td className="px-3 py-2 text-right">${fmt(p.monto)}</td>
                                <td className="px-3 py-2">{p.descripcion || "—"}</td>
                                <td className="px-3 py-2 text-sm opacity-70">
                                  {new Date(p.fechaISO).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    className="px-2 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-xs"
                                    onClick={() => eliminarPrestamo(p._id)}
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {extraEmpleado && (
            <>
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={cerrarExtrasEmpleado}
                aria-hidden="true"
              />
              <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-6">
                <div className="w-full max-w-3xl rounded-t-3xl shadow-2xl bg-white dark:bg-petro-charcoal border border-petro-line/40 dark:border-white/10">
                  <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-petro-line/40 dark:border-white/10">
                    <div>
                      <h3 className="text-lg font-semibold text-petro-redDark dark:text-petro-redLight">
                        Datos extra de {extraEmpleado.nombre}
                      </h3>
                      <p className="text-xs opacity-60">
                        Edita dirección, teléfono, RFC y CURP desde este panel.
                      </p>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                      onClick={cerrarExtrasEmpleado}
                      type="button"
                    >
                      Cerrar
                    </button>
                  </header>
                  <form
                    className="px-6 py-5 space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void guardarExtrasEmpleado();
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium">Dirección</span>
                        <textarea
                          className="w-full h-20 resize-none rounded-lg px-3 py-2 bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                          value={extraForm.direccion}
                          onChange={(e) =>
                            setExtraForm((prev) => ({ ...prev, direccion: e.target.value }))
                          }
                          placeholder="Calle, número, colonia…"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-4">
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">Teléfono</span>
                          <input
                            className="w-full rounded-lg px-3 py-2 bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                            value={extraForm.telefono}
                            onChange={(e) =>
                              setExtraForm((prev) => ({ ...prev, telefono: e.target.value }))
                            }
                            placeholder="Ej. 55 1234 5678"
                            type="tel"
                            inputMode="tel"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">RFC</span>
                          <input
                            className="w-full rounded-lg px-3 py-2 uppercase bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                            value={extraForm.rfc}
                            onChange={(e) =>
                              setExtraForm((prev) => ({
                                ...prev,
                                rfc: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="RFC"
                            maxLength={13}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="font-medium">CURP</span>
                          <input
                            className="w-full rounded-lg px-3 py-2 uppercase bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                            value={extraForm.curp}
                            onChange={(e) =>
                              setExtraForm((prev) => ({
                                ...prev,
                                curp: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="CURP"
                            maxLength={18}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-3">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                        onClick={cerrarExtrasEmpleado}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow hover:shadow-lg"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* ─────────────── BILLETES ─────────────── */}
          {section === "billetes" && (
            <div className="space-y-4">
              {/* Acciones */}
              <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow"
                    onClick={presetDiezMil}
                  >
                    Preset 10,000 (5×1000, 5×500, resto 100)
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    onClick={limpiarBilletes}
                  >
                    Limpiar
                  </button>
                  <button
                    className="ml-auto px-3 py-2 rounded-xl bg-gradient-to-r from-petro-redDark to-petro-red text-white text-sm shadow"
                    onClick={registrarEntrega}
                  >
                    Registrar entrega
                  </button>
                </div>
              </div>

              {/* Formulario conteo */}
              <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                <h3 className="font-semibold text-petro-redDark mb-3">Conteo de billetes</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {DENOMS.map((d) => (
                    <div
                      key={d}
                      className="rounded-xl p-3 bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                    >
                      <div className="text-xs opacity-70 mb-1">Denominación</div>
                      <div className="text-lg font-semibold">${d}</div>
                      <div className="mt-2 text-xs opacity-70">Cantidad</div>
                      <input
                        type="number"
                        className="mt-1 w-full px-2 py-1 rounded-lg bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-right"
                        value={counts[d]}
                        onChange={(e) => setCount(d, Number(e.target.value))}
                        min={0}
                      />
                      <div className="mt-2 text-right text-sm">
                        Subtotal: <b>${fmt(d * (counts[d] || 0))}</b>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
                  <div className="text-base">
                    Total a entregar:{" "}
                    <b className="text-petro-redDark">${fmt(totalBilletes)}</b>
                  </div>
                  <input
                    className="md:ml-auto flex-1 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                    placeholder="Nota (quién recibió, sucursal, etc.)"
                    value={notaBilletes}
                    onChange={(e) => setNotaBilletes(e.target.value)}
                  />
                </div>
              </div>

              {/* Historial */}
              <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">Historial de entregas</h3>
                  <button
                    className="ml-auto px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                    onClick={exportarBilletesCSV}
                    disabled={!billetes.length}
                  >
                    Exportar CSV
                  </button>
                </div>

                <div className="overflow-auto rounded-xl border border-petro-line/60 dark:border-white/10">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-right">1000</th>
                        <th className="px-3 py-2 text-right">500</th>
                        <th className="px-3 py-2 text-right">200</th>
                        <th className="px-3 py-2 text-right">100</th>
                        <th className="px-3 py-2 text-right">50</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2">Nota</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {billetes.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-6 text-center opacity-70">
                            Sin registros. Usa “Preset 10,000” o captura el conteo y pulsa “Registrar entrega”.
                          </td>
                        </tr>
                      ) : (
                        billetes.map((b, idx) => (
                          <tr key={b.id} className={idx % 2 ? "bg-white/60 dark:bg-white/5" : "bg-white/30 dark:bg-transparent"}>
                            <td className="px-3 py-2">
                              {new Date(b.fechaISO).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right">{b.desglose[1000] || 0}</td>
                            <td className="px-3 py-2 text-right">{b.desglose[500] || 0}</td>
                            <td className="px-3 py-2 text-right">{b.desglose[200] || 0}</td>
                            <td className="px-3 py-2 text-right">{b.desglose[100] || 0}</td>
                            <td className="px-3 py-2 text-right">{b.desglose[50] || 0}</td>
                            <td className="px-3 py-2 text-right font-mono">${fmt(b.total)}</td>
                            <td className="px-3 py-2">{b.nota || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                className="px-2 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-xs"
                                onClick={() =>
                                  setBilletes((prev) => prev.filter((x) => x.id !== b.id))
                                }
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {detalleNomina && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
              <div className="w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl border border-petro-line/50 bg-white text-petro-ink dark:bg-[#1E1E1E] dark:text-white dark:border-gray-700">
                <h2 className="text-2xl font-bold text-petro-redDark dark:text-amber-400 mb-4">
                  Detalles de {detalleNomina.semana}
                </h2>

                {Array.isArray(detalleNomina.empleados) && detalleNomina.empleados.length > 0 ? (
                  <table className="w-full border-collapse text-sm rounded-xl overflow-hidden">
                    <thead className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                      <tr>
                        <th className="p-2 text-left">Empleado</th>
                        <th className="p-2 text-left">Horas primarias</th>
                        <th className="p-2 text-left">Horas extras</th>
                        <th className="p-2 text-left">Pago base</th>
                        <th className="p-2 text-left">Bono semanal</th>
                        <th className="p-2 text-left">Bono mensual</th>
                        <th className="p-2 text-left">Comisión</th>
                        <th className="p-2 text-left">Descuentos</th>
                        <th className="p-2 text-left text-green-400">Total final</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-[#121212]">
                      {detalleNomina.empleados.map((e: NominaEmpleado, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-petro-line/40 hover:bg-petro-line/15 dark:border-gray-700 dark:hover:bg-[#2B2B2B]"
                        >
                          <td className="p-2 font-semibold text-petro-redDark dark:text-amber-300">
                            {e.nombre ?? "Sin nombre"}
                          </td>
                          <td className="p-2">{fmt(Number(e.total_horas_primarias ?? 0))}</td>
                          <td className="p-2">{fmt(Number(e.horas_extras ?? 0))}</td>
                          <td className="p-2">${fmt(Number(e.costo_hora_primaria ?? 0))}</td>
                          <td className="p-2">${fmt(Number(e.bono_semanal ?? 0))}</td>
                          <td className="p-2">${fmt(Number(e.bono_mensual ?? 0))}</td>
                          <td className="p-2">${fmt(Number(e.comision ?? e.comisiones ?? 0))}</td>
                          <td className="p-2 text-red-600 dark:text-red-400">
                            -${fmt(Number(e.descuentos ?? 0))}
                          </td>
                          <td className="p-2 font-bold text-green-600 dark:text-green-400">
                            ${fmt(Number(e.total_final ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-petro-ink/80 dark:text-white/80">
                    Esta nómina no incluye empleados para mostrar.
                  </p>
                )}

                <div className="mt-6 flex justify-between items-center border-t border-petro-line/40 pt-4 dark:border-gray-700">
                  <p className="text-lg font-semibold text-petro-ink dark:text-gray-300">
                    Total general:&nbsp;
                    <span className="text-green-600 dark:text-green-400">
                      ${fmt(Number(detalleNomina.totalGeneral ?? 0))}
                    </span>
                  </p>
                  <button
                    onClick={() => setDetalleNomina(null)}
                    className="px-4 py-2 rounded-lg bg-petro-red text-white hover:bg-petro-redDark dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {modalAlert && currentAlertStyle && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl shadow-2xl ring-1 ring-black/10 dark:ring-white/15 bg-white dark:bg-[#0b1020] p-6 space-y-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className={`text-3xl ${currentAlertStyle.accent}`} aria-hidden="true">
                {currentAlertStyle.icon}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${currentAlertStyle.badge}`}
              >
                {currentAlertStyle.label}
              </span>
            </div>
            <div className="text-sm text-petro-ink dark:text-white space-y-1">
              {modalAlert.message.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={closeAlert}
                className={`px-5 py-2 rounded-xl text-white font-semibold shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${currentAlertStyle.button}`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ───── Componentes auxiliares ─────────────────────────────────── */
function MetricCard({
  title,
  value,
  from,
  to,
}: {
  title: string;
  value: string;
  from: string;
  to: string;
}) {
  return (
    <div className="relative rounded-2xl shadow-xl">
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${from} ${to} opacity-90`} />
      <div className="relative rounded-2xl p-[1px]">
        <div className="rounded-2xl bg-white/80 dark:bg-[#0b1020]/70 backdrop-blur ring-1 ring-black/5 dark:ring-white/10 p-4">
          <p className="text-xs opacity-80">{title}</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-petro-ink to-petro-charcoal dark:from-white dark:to-white/90">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionGuide({ info }: { info?: SectionGuideInfo }) {
  if (!info) return null;
  return (
    <section className="rounded-3xl p-5 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/90 dark:bg-[#0c111d]/80 backdrop-blur space-y-4">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-petro-ink/60 dark:text-white/60">
          Guía express
        </span>
        <h1 className="text-2xl font-bold text-petro-redDark dark:text-white">{info.title}</h1>
        <p className="text-sm text-petro-ink/80 dark:text-white/80">{info.subtitle}</p>
        <p className="text-xs text-petro-ink/60 dark:text-white/60">{info.helper}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {info.steps.map((step) => (
          <article
            key={step.label}
            className="rounded-2xl border border-petro-line/60 dark:border-white/10 bg-white/80 dark:bg-white/5 p-4 shadow-sm"
          >
            <span className="inline-flex items-center rounded-full bg-petro-line/60 dark:bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-petro-ink/60 dark:text-white/60">
              {step.badge}
            </span>
            <h3 className="mt-2 text-base font-semibold text-petro-ink dark:text-white">
              {step.label}
            </h3>
            <p className="mt-1 text-sm text-petro-ink/80 dark:text-white/70">{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
