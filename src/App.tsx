import { useEffect, useMemo, useState } from "react";

type Row = Record<string, any>;
type Section = "nominas" | "empleados" | "checkin" | "billetes";

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

/* ───── Tipos Empleados ───────────────────────────────────────── */
type Estatus = "Activo" | "Baja";
type TipoPago = "Por horas" | "Semanal fijo";

type Employee = {
  id: string;
  nombre: string;
  puesto: string;
  area: string;
  estatus: Estatus;
  tarifa: number;   // $/h primaria
  extraX: number;   // multiplicador hora extra (ej. 1.5)
  tipoPago: TipoPago;
  pagoSemanal: number;
};

/* ───── App ────────────────────────────────────────────────────── */
export default function App() {
  const { dark, setDark } = useTheme();
  const [section, setSection] = useState<Section>("nominas");

  // Título de semana (solo debajo de la tabla de nóminas)
  const [sectionTitle, setSectionTitle] = useState<string>("");

  // Datos nómina
  const [rawData, setRawData] = useState<Row[]>([]);
  useEffect(() => {
    fetch("/nominas_merged_clean.json")
      .then((r) => r.json())
      .then((data: Row[]) => {
        const withSemana = data.find(
          (r) => typeof r.semana === "string" && r.semana.trim() !== ""
        );
        if (withSemana?.semana) setSectionTitle(String(withSemana.semana));
        const cleaned = data.map(({ semana, ...rest }) => rest);
        setRawData(cleaned);
      })
      .catch((err) => console.error("No se pudo cargar el JSON:", err));
  }, []);

  // Columnas
  const columns = useMemo(
    () => (rawData.length ? Object.keys(rawData[0]) : []),
    [rawData]
  );
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

  // Top 15
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
      .slice(0, 15);
  }, [datosPeriodo, nameCol, amountCol]);
  const maxTop = useMemo(
    () => (topTotales.length ? Math.max(...topTotales.map((t) => t.total)) : 0),
    [topTotales]
  );

  // Columnas visibles
  const visibleCols = useMemo(() => columns.slice(0, 30), [columns]);

  /* ───── Nueva semana (editor) ────────────────────────────────── */
  const [editorOpen, setEditorOpen] = useState(false);
  const [semanaInput, setSemanaInput] = useState<string>("");

  // Auto-cálculos
  const [autoExtra, setAutoExtra] = useState<boolean>(true);
  const [extraMultiplier, setExtraMultiplier] = useState<number>(1.5);
  const [autoHorasExtra, setAutoHorasExtra] = useState<boolean>(false);
  const [extrasThreshold, setExtrasThreshold] = useState<number>(48);

  type Draft = {
    nombre: string;
    total_horas_primarias: number; // horas normales capturadas
    horas_extras: number;
    costo_hora_primaria: number;
    costo_hora_extra: number;
    bono_semanal: number;
    descuentos: number;
    pendiente_descuento: number;
    pago_semanal_base: number;
    extra?: string;
  };

  const [draftRows, setDraftRows] = useState<Draft[]>([
    {
      nombre: "",
      total_horas_primarias: 0,
      horas_extras: 0,
      costo_hora_primaria: 0,
      costo_hora_extra: 0,
      bono_semanal: 0,
      descuentos: 0,
      pendiente_descuento: 0,
      pago_semanal_base: 0,
      extra: "",
    },
  ]);

  const addDraftRow = () =>
    setDraftRows((rows) => [
      ...rows,
      {
        nombre: "",
        total_horas_primarias: 0,
        horas_extras: 0,
        costo_hora_primaria: 0,
        costo_hora_extra: 0,
        bono_semanal: 0,
        descuentos: 0,
        pendiente_descuento: 0,
        pago_semanal_base: 0,
        extra: "",
      },
    ]);
  const removeDraftRow = (idx: number) =>
    setDraftRows((rows) => rows.filter((_, i) => i !== idx));

  // Helpers para setear con autocalculo
  function setRow<K extends keyof Draft>(idx: number, key: K, value: Draft[K]) {
    setDraftRows((rows) =>
      rows.map((r, i) => {
        if (i !== idx) return r;
        let next: Draft = { ...r, [key]: value } as Draft;

        // Auto: horas extra sobre umbral
        if (autoHorasExtra && key === "total_horas_primarias") {
          const totalIngresado = Number(value) || 0;
          const extras = Math.max(0, totalIngresado - extrasThreshold);
          const prim = Math.min(totalIngresado, extrasThreshold);
          next.total_horas_primarias = prim;
          next.horas_extras = extras;
        }

        // Auto: costo hora extra = primaria * multiplicador
        if (autoExtra && (key === "costo_hora_primaria" || key === "horas_extras")) {
          const base = Number(
            key === "costo_hora_primaria" ? value : next.costo_hora_primaria
          );
          if (!isNaN(base)) {
            const calc = Math.round(base * extraMultiplier * 100) / 100;
            next.costo_hora_extra = calc;
          }
        }
        return next;
      })
    );
  }

  const updateDraft = <K extends keyof Draft>(
    idx: number,
    key: K,
    value: Draft[K]
  ) => setRow(idx, key, value);

  function draftToRows(): Row[] {
    return draftRows
      .filter((r) => r.nombre.trim() !== "")
      .map((r) => {
        const pago_horas_primarias =
          Number(r.total_horas_primarias) * Number(r.costo_hora_primaria);
        const pago_horas_extras =
          Number(r.horas_extras) * Number(r.costo_hora_extra);
        const pago_semanal_calc = pago_horas_primarias + pago_horas_extras;
        const total = pago_semanal_calc - Number(r.descuentos || 0);
        const total_2 = total + Number(r.bono_semanal || 0);
        const total_final = total_2;

        return {
          nombre: r.nombre,
          total_horas: Number(r.total_horas_primarias) + Number(r.horas_extras),
          horas_primarias: 53,
          horas_extras: Number(r.horas_extras),
          pago_semanal_base: Number(r.pago_semanal_base || 0),
          costo_hora_primaria: Number(r.costo_hora_primaria),
          total_horas_primarias: Number(r.total_horas_primarias),
          pago_horas_primarias: pago_horas_primarias,
          costo_hora_extra: Number(r.costo_hora_extra),
          pago_horas_extras: pago_horas_extras,
          pago_semanal_calc: pago_semanal_calc,
          descuentos: Number(r.descuentos || 0),
          pendiente_descuento: Number(r.pendiente_descuento || 0),
          total: total,
          bono_semanal: Number(r.bono_semanal || 0),
          total_2: total_2,
          bono_mensual: null,
          comision: null,
          total_con_bono_mensual: total_2,
          extra: r.extra ?? null,
          total_final: total_final,
        } as Row;
      });
  }

  function addWeekToView() {
    const newRows = draftToRows();
    if (!newRows.length) {
      alert("Agrega por lo menos un empleado con nombre.");
      return;
    }
    if (!semanaInput.trim()) {
      alert("Escribe el título de la semana.");
      return;
    }
    setRawData((prev) => [...newRows, ...prev]);
    setSectionTitle(semanaInput.trim());
    setEditorOpen(false);
    setSemanaInput("");
    setDraftRows([
      {
        nombre: "",
        total_horas_primarias: 0,
        horas_extras: 0,
        costo_hora_primaria: 0,
        costo_hora_extra: 0,
        bono_semanal: 0,
        descuentos: 0,
        pendiente_descuento: 0,
        pago_semanal_base: 0,
        extra: "",
      },
    ]);
    setPage(0);
  }

  function downloadWeekJSON() {
    const rows = draftToRows().map((r) => ({ semana: semanaInput || "", ...r }));
    if (!rows.length) {
      alert("No hay filas válidas para descargar.");
      return;
    }
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nomina_${(semanaInput || "semana").replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ───── Empleados (estado + persistencia) ────────────────────── */
  const [empleados, setEmpleados] = useState<Employee[]>(() => {
    const withDefaults = (list: any[]): Employee[] =>
      list.map((emp) => {
        const tipoPago = (emp?.tipoPago ?? "Por horas") as TipoPago;
        const pagoSemanal = Number(emp?.pagoSemanal ?? 0);
        return {
          id: emp?.id ?? crypto.randomUUID(),
          nombre: emp?.nombre ?? "",
          puesto: emp?.puesto ?? "",
          area: emp?.area ?? "",
          estatus: (emp?.estatus ?? "Activo") as Estatus,
          tarifa: Number(emp?.tarifa ?? 0),
          extraX: Number(emp?.extraX ?? 1.5),
          tipoPago,
          pagoSemanal,
        };
      });

    try {
      const saved = localStorage.getItem("empleados_v1");
      if (saved) return withDefaults(JSON.parse(saved));
    } catch {}
    // Seed mínimo
    return withDefaults([
      {
        id: crypto.randomUUID(),
        nombre: "SERGIO",
        puesto: "Operador",
        area: "Planta",
        estatus: "Activo",
        tarifa: 60,
        extraX: 1.5,
        tipoPago: "Por horas",
        pagoSemanal: 0,
      },
      {
        id: crypto.randomUUID(),
        nombre: "VALERIA",
        puesto: "Administrativo",
        area: "Oficina",
        estatus: "Activo",
        tarifa: 45,
        extraX: 2,
        tipoPago: "Por horas",
        pagoSemanal: 0,
      },
    ]);
  });
  /* ───── Préstamos ─────────────────────────────────────────────── */
  type Prestamo = {
    id: string;
    empleadoId: string;
    fechaISO: string;
    monto: number;
    descripcion: string;
  };

  const [prestamos, setPrestamos] = useState<Prestamo[]>(() => {
    try {
      const saved = localStorage.getItem("prestamos_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("prestamos_v1", JSON.stringify(prestamos));
    } catch {}
  }, [prestamos]);

  function agregarPrestamo(empleadoId: string, monto: number, descripcion: string) {
    const nuevo: Prestamo = {
      id: crypto.randomUUID(),
      empleadoId,
      fechaISO: new Date().toISOString(),
      monto,
      descripcion,
    };
    setPrestamos((prev) => [nuevo, ...prev]);
  }

  function eliminarPrestamo(id: string) {
    setPrestamos((prev) => prev.filter((p) => p.id !== id));
  }
  useEffect(() => {
    try {
      localStorage.setItem("empleados_v1", JSON.stringify(empleados));
    } catch {}
  }, [empleados]);

  const byNombre = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of empleados) m.set(e.nombre.trim().toUpperCase(), e);
    return m;
  }, [empleados]);

  /* ───── Check-in ─────────────────────────────────────────────── */
  type DayPair = { in: string; out: string };
  type CheckRow = {
    nombre: string;
    LUN: DayPair; MAR: DayPair; MIE: DayPair; JUE: DayPair; VIE: DayPair; SAB: DayPair;
  };

  const [checkRows, setCheckRows] = useState<CheckRow[]>([
    {
      nombre: "",
      LUN: { in: "08:30", out: "18:00" },
      MAR: { in: "08:30", out: "18:00" },
      MIE: { in: "", out: "" },
      JUE: { in: "", out: "" },
      VIE: { in: "08:30", out: "14:00" },
      SAB: { in: "", out: "" },
    },
  ]);

  const addCheckRow = () =>
    setCheckRows((rows) => [
      ...rows,
      {
        nombre: "",
        LUN: { in: "", out: "" },
        MAR: { in: "", out: "" },
        MIE: { in: "", out: "" },
        JUE: { in: "", out: "" },
        VIE: { in: "", out: "" },
        SAB: { in: "", out: "" },
      },
    ]);
  const removeCheckRow = (idx: number) =>
    setCheckRows((rows) => rows.filter((_, i) => i !== idx));

  function updateCheck(idx: number, day: keyof CheckRow, field: "in" | "out", value: string) {
    setCheckRows((rows) =>
      rows.map((r, i) =>
        i === idx
          ? {
              ...r,
              [day]:
                day === "nombre"
                  ? r[day]
                  : {
                      ...(r[day] as DayPair),
                      [field]: value,
                    },
            }
          : r
      )
    );
  }
  function updateCheckName(idx: number, value: string) {
    setCheckRows((rows) => rows.map((r, i) => (i === idx ? { ...r, nombre: value } : r)));
  }
  function calcHoursForRow(r: CheckRow) {
    return (
      spanHours(r.LUN.in, r.LUN.out) +
      spanHours(r.MAR.in, r.MAR.out) +
      spanHours(r.MIE.in, r.MIE.out) +
      spanHours(r.JUE.in, r.JUE.out) +
      spanHours(r.VIE.in, r.VIE.out) +
      spanHours(r.SAB.in, r.SAB.out)
    );
  }
  function pushCheckinToDraft() {
    const mapped = checkRows
      .filter((r) => r.nombre.trim() !== "")
      .map((r) => {
        const hours = Number(calcHoursForRow(r).toFixed(2));

        // Busca empleado para tarifas; si no, deja en 0
        const emp = byNombre.get(r.nombre.trim().toUpperCase());
        const base =
          emp?.tipoPago === "Semanal fijo"
            ? (emp?.pagoSemanal ?? 0) / 48
            : emp?.tarifa ?? 0;
        const mult = emp?.extraX ?? extraMultiplier;
        const costoExtra = autoExtra ? Math.round(base * mult * 100) / 100 : 0;

        // Si está activo el auto de horas extra por umbral
        let prim = hours;
        let ext = 0;
        if (autoHorasExtra) {
          ext = Math.max(0, hours - extrasThreshold);
          prim = Math.min(hours, extrasThreshold);
        }

        return {
          nombre: r.nombre,
          total_horas_primarias: prim,
          horas_extras: ext,
          costo_hora_primaria: base,
          costo_hora_extra: costoExtra,
          bono_semanal: 0,
          descuentos: 0,
          pendiente_descuento: 0,
          pago_semanal_base: 0,
          extra: "",
        };
      }) as Draft[];

    if (!mapped.length) {
      alert("Captura al menos un empleado con horario.");
      return;
    }
    setDraftRows(mapped);
    setSection("nominas");
    setEditorOpen(true);
  }
  function loadUserTemplate() {
    const toRow = (arr: Array<string | undefined>): CheckRow => ({
      nombre: "",
      LUN: { in: arr[0] || "", out: arr[1] || "" },
      MAR: { in: arr[2] || "", out: arr[3] || "" },
      MIE: { in: arr[4] || "", out: arr[5] || "" },
      JUE: { in: arr[6] || "", out: arr[7] || "" },
      VIE: { in: arr[8] || "", out: arr[9] || "" },
      SAB: { in: arr[10] || "", out: arr[11] || "" },
    });
    const rows: CheckRow[] = [
      toRow(["08:30","18:00","08:30","19:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","18:00","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","18:00","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","18:00","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","18:00","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","18:00","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:45","18:00","08:45","","08:30","14:00","","",""]),
      toRow(["08:30","18:00","08:30","18:00","08:30","","08:30","14:00","","",""]),
    ];
    setCheckRows(rows);
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
      alert("Captura al menos un billete.");
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
              {(["nominas", "checkin", "empleados", "billetes"] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`w-full text-left px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition ${
                    section === s ? "ring-2 ring-white/60" : ""
                  }`}
                >
                  {s === "nominas"
                    ? "Nóminas"
                    : s === "checkin"
                    ? "Check-in"
                    : s === "empleados"
                    ? "Empleados"
                    : "Billetes"}
                </button>
              ))}
            </nav>
            <div className="mt-4 text-xs/relaxed px-2 py-2 bg-white/10 rounded-xl">
              <div className="opacity-80">Consejo</div>
              <div className="opacity-75">
                Captura entradas/salidas en “Check-in” y envía a “Nueva semana”.
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="space-y-6">
          {/* ─────────────── CHECK-IN ─────────────── */}
          {section === "checkin" && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow"
                    onClick={addCheckRow}
                  >
                    + Agregar fila
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-sm"
                    onClick={loadUserTemplate}
                  >
                    Cargar plantilla (lo que me mandaste)
                  </button>
                  <button
                    className="ml-auto px-3 py-2 rounded-xl bg-gradient-to-r from-petro-redDark to-petro-red text-white text-sm shadow"
                    onClick={pushCheckinToDraft}
                  >
                    Enviar a “Nueva semana”
                  </button>
                </div>
              </div>

              {/* SCROLL CONTROLADO */}
              <div className="rounded-2xl shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-[13px]">
                    <colgroup>
                      <col className="w-[220px]" />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                      <col className="w-[90px]" />
                      <col className="w-[60px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                        <th className="px-3 py-2 text-left">Nombre</th>
                        {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].map((d) => (
                          <th key={d} className="px-2 py-2 text-center">{d}</th>
                        ))}
                        <th className="px-2 py-2 text-right">Horas (sem)</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkRows.map((r, idx) => {
                        const total = calcHoursForRow(r);
                        const nombres = empleados.map((e) => e.nombre);
                        return (
                          <tr key={idx} className={idx % 2 ? "bg-white/60 dark:bg-white/5" : "bg-white/30 dark:bg-transparent"}>
                            <td className="px-3 py-2">
                              <div className="flex gap-2">
                                <input
                                  list={`empleados-list-${idx}`}
                                  className="w-full min-w-0 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.nombre}
                                  onChange={(e) => updateCheckName(idx, e.target.value)}
                                  placeholder={`Empleado ${idx + 1}`}
                                />
                                <datalist id={`empleados-list-${idx}`}>
                                  {nombres.map((n) => (
                                    <option key={n} value={n} />
                                  ))}
                                </datalist>
                              </div>
                            </td>
                            {(["LUN","MAR","MIE","JUE","VIE","SAB"] as (keyof CheckRow)[]).map((day) => (
                              <td key={String(day)} className="px-2 py-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="time"
                                    className="w-full min-w-0 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                    value={(r[day] as DayPair).in}
                                    onChange={(e) => updateCheck(idx, day, "in", e.target.value)}
                                  />
                                  <span className="opacity-50">→</span>
                                  <input
                                    type="time"
                                    className="w-full min-w-0 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                    value={(r[day] as DayPair).out}
                                    onChange={(e) => updateCheck(idx, day, "out", e.target.value)}
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="px-2 py-2 text-right font-mono">{fmt(total)}</td>
                            <td className="px-2 py-2 text-right">
                              <button
                                className="px-2 py-1 rounded-md bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                                onClick={() => removeCheckRow(idx)}
                                title="Eliminar fila"
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

                <div className="p-2 text-xs opacity-80 text-right">
                  Total horas (todas las filas):{" "}
                  <b>
                    {fmt(checkRows.reduce((a, r) => a + calcHoursForRow(r), 0))}
                  </b>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────── NÓMINAS ─────────────── */}
          {section === "nominas" && (
            <>
              {/* TOOLBAR */}
              <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    className="px-3 py-2 w-72 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-petro-red"
                    placeholder="Buscar en todo…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(0);
                    }}
                  />
                  <select
                    className="px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                    value={nameCol}
                    onChange={(e) => setNameCol(e.target.value)}
                  >
                    <option value="">Columna de nombre…</option>
                    {textCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    className="px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                    value={amountCol}
                    onChange={(e) => setAmountCol(e.target.value)}
                  >
                    <option value="">Columna de monto…</option>
                    {numericCols.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    className="px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
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

                  <button
                    className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white shadow hover:shadow-lg active:scale-[0.98] transition"
                    onClick={() => {
                      const csv = toCSV(datosPeriodo);
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = periodo
                        ? `nominas_${periodo}.csv`
                        : "nominas_todos.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    disabled={!datosPeriodo.length}
                  >
                    Exportar CSV
                  </button>

                  <button
                    className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                    onClick={() => setEditorOpen((v) => !v)}
                  >
                    {editorOpen ? "Cerrar editor" : "Nueva semana"}
                  </button>
                </div>
              </div>

              {/* EDITOR NUEVA SEMANA */}
              {editorOpen && (
                <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/80 dark:bg-white/5 backdrop-blur space-y-4">
                  <h3 className="font-semibold text-petro-redDark">Capturar nómina de nueva semana</h3>

                  {/* Controles de auto-cálculo */}
                  <div className="flex flex-wrap gap-3 text-xs items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoExtra}
                        onChange={(e) => setAutoExtra(e.target.checked)}
                      />
                      $/h extra automático = $/h primaria ×
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-16 px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                      value={extraMultiplier}
                      onChange={(e) => setExtraMultiplier(Math.max(0, Number(e.target.value) || 0))}
                      title="Multiplicador para hora extra"
                    />
                    <span className="opacity-60">·</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoHorasExtra}
                        onChange={(e) => setAutoHorasExtra(e.target.checked)}
                      />
                      Calcular horas extra sobre
                    </label>
                    <input
                      type="number"
                      className="w-16 px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                      value={extrasThreshold}
                      onChange={(e) => setExtrasThreshold(Math.max(0, Number(e.target.value) || 0))}
                      title="Umbral de horas normales por semana"
                    />
                    <span className="opacity-60">h/sem</span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      className="flex-1 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                      placeholder='Título de semana (ej. "SEMANA #36 DEL 08 AL 14 DE SEPTIEMBRE 2025")'
                      value={semanaInput}
                      onChange={(e) => setSemanaInput(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white shadow hover:shadow-lg"
                        onClick={addWeekToView}
                      >
                        Agregar a la vista
                      </button>
                      <button
                        className="px-4 py-2 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                        onClick={downloadWeekJSON}
                      >
                        Descargar JSON (solo esta semana)
                      </button>
                    </div>
                  </div>

                  <div className="overflow-auto rounded-xl border border-petro-line/60 dark:border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-petro-red to-petro-redDark text-white">
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2 text-right">Horas primarias</th>
                          <th className="px-3 py-2 text-right">Horas extras</th>
                          <th className="px-3 py-2 text-right">$/h primaria</th>
                          <th className="px-3 py-2 text-right">$/h extra</th>
                          <th className="px-3 py-2 text-right">Bono semanal</th>
                          <th className="px-3 py-2 text-right">Descuentos</th>
                          <th className="px-3 py-2 text-right">Pend. desc.</th>
                          <th className="px-3 py-2 text-right">Base semanal</th>
                          <th className="px-3 py-2">Extra</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftRows.map((r, idx) => {
                          return (
                            <tr
                              key={idx}
                              className={idx % 2 ? "bg-white/60 dark:bg-white/5" : "bg-white/30 dark:bg-transparent"}
                            >
                              <td className="px-3 py-2">
                                <input
                                  className="w-44 px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.nombre}
                                  onChange={(e) => updateDraft(idx, "nombre", e.target.value)}
                                  placeholder="Empleado"
                                  list="empleados-nombres"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.total_horas_primarias}
                                  onChange={(e) =>
                                    updateDraft(idx, "total_horas_primarias", Number(e.target.value))
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-24 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.horas_extras}
                                  onChange={(e) => updateDraft(idx, "horas_extras", Number(e.target.value))}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.costo_hora_primaria}
                                  onChange={(e) => updateDraft(idx, "costo_hora_primaria", Number(e.target.value))}
                                  onBlur={(e) => {
                                    if (autoExtra) {
                                      const base = Number(e.target.value) || 0;
                                      const calc = Math.round(base * extraMultiplier * 100) / 100;
                                      updateDraft(idx, "costo_hora_extra", calc as any);
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-24 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.costo_hora_extra}
                                  onChange={(e) => updateDraft(idx, "costo_hora_extra", Number(e.target.value))}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.bono_semanal}
                                  onChange={(e) => updateDraft(idx, "bono_semanal", Number(e.target.value))}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.descuentos}
                                  onChange={(e) => updateDraft(idx, "descuentos", Number(e.target.value))}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.pendiente_descuento}
                                  onChange={(e) => updateDraft(idx, "pendiente_descuento", Number(e.target.value))}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-28 text-right px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.pago_semanal_base}
                                  onChange={(e) => updateDraft(idx, "pago_semanal_base", Number(e.target.value))}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  className="w-40 px-2 py-1 rounded-lg bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={r.extra || ""}
                                  onChange={(e) => updateDraft(idx, "extra", e.target.value)}
                                  placeholder="Nota/extra"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  className="px-2 py-1 rounded-lg bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                                  onClick={() => removeDraftRow(idx)}
                                  title="Eliminar fila"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <datalist id="empleados-nombres">
                      {empleados.map((e) => (
                        <option key={e.id} value={e.nombre} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex items-center justify-between text-xs opacity-80">
                    <div>
                      <button
                        className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 hover:bg-white"
                        onClick={addDraftRow}
                      >
                        + Agregar empleado
                      </button>
                    </div>
                    <div className="text-right">
                      {(() => {
                        const prim = draftRows.reduce(
                          (a, r) => a + r.total_horas_primarias * r.costo_hora_primaria,
                          0
                        );
                        const ext = draftRows.reduce(
                          (a, r) => a + r.horas_extras * r.costo_hora_extra,
                          0
                        );
                        const bonos = draftRows.reduce((a, r) => a + (r.bono_semanal || 0), 0);
                        const desc = draftRows.reduce((a, r) => a + (r.descuentos || 0), 0);
                        const calc = prim + ext;
                        const total = calc - desc + bonos;
                        return (
                          <div>
                            <div>Pago primarias: <b>{fmt(prim)}</b> · Pago extras: <b>{fmt(ext)}</b></div>
                            <div>Bonos: <b>{fmt(bonos)}</b> · Descuentos: <b>{fmt(desc)}</b></div>
                            <div>Total estimado semana: <b>{fmt(total)}</b></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

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
                <div className="lg:col-span-2">
                  {rawData.length === 0 ? (
                    <p className="text-sm opacity-70">
                      Cargando datos… asegúrate de tener <code>public/nominas_merged_clean.json</code>
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

                {/* Top 15 */}
                <div className="rounded-2xl p-4 shadow-xl ring-1 ring-petro-line/60 dark:ring-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
                  <h2 className="font-semibold mb-3">
                    Top 15 por total ({amountCol || "monto"})
                    {periodo ? ` · ${periodo}` : ""}
                  </h2>
                  {!nameCol || !amountCol ? (
                    <p className="text-sm opacity-70">Selecciona columnas de nombre y monto.</p>
                  ) : topTotales.length === 0 ? (
                    <p className="text-sm opacity-70">Sin datos.</p>
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
            </>
          )}

          {/* ─────────────── EMPLEADOS ─────────────── */}
          {section === "empleados" && (
            <div className="space-y-4">
              {/* Barra de acciones */}
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-petro-red to-petro-redDark text-white text-sm shadow"
                  onClick={() =>
                    setEmpleados((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        nombre: "",
                        puesto: "Operador",
                        area: "Planta",
                        estatus: "Activo",
                        tarifa: 0,
                        extraX: 1.5,
                        tipoPago: "Por horas",
                        pagoSemanal: 0,
                      },
                    ])
                  }
                >
                  + Nuevo empleado
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-white/70 dark:bg-white/10 border border-petro-line/60 text-sm"
                  onClick={() => {
                    const csv = toCSV(
                      empleados.map((e) => ({
                        id: e.id,
                        nombre: e.nombre,
                        puesto: e.puesto,
                        area: e.area,
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
                        {empleados.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-3 py-6 text-center opacity-70">
                              Sin empleados. Agrega uno con “+ Nuevo empleado”.
                            </td>
                          </tr>
                        ) : (
                          empleados.map((emp, idx) => (
                            <tr
                              key={emp.id}
                              className={idx % 2 ? "bg-white/70 dark:bg-white/5" : "bg-white/40 dark:bg-transparent"}
                            >
                              <td className="px-3 py-2">
                                <input
                                  className="w-full px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.nombre}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x.id === emp.id ? { ...x, nombre: e.target.value } : x))
                                    )
                                  }
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
                                        x.id === emp.id ? { ...x, tipoPago: e.target.value as TipoPago } : x
                                      )
                                    )
                                  }
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
                                        x.id === emp.id ? { ...x, pagoSemanal: Number(e.target.value) } : x
                                      )
                                    )
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  className="w-36 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-center"
                                  value={emp.puesto}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x.id === emp.id ? { ...x, puesto: e.target.value } : x))
                                    )
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  className="w-28 px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10 text-center"
                                  value={emp.area}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) => (x.id === emp.id ? { ...x, area: e.target.value } : x))
                                    )
                                  }
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <select
                                  className="px-2 py-1 rounded-md bg-white/70 dark:bg-white/10 border border-petro-line/60 dark:border-white/10"
                                  value={emp.estatus}
                                  onChange={(e) =>
                                    setEmpleados((prev) =>
                                      prev.map((x) =>
                                        x.id === emp.id ? { ...x, estatus: e.target.value as Estatus } : x
                                      )
                                    )
                                  }
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
                                      prev.map((x) => (x.id === emp.id ? { ...x, tarifa: Number(e.target.value) } : x))
                                    )
                                  }
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
                                      prev.map((x) => (x.id === emp.id ? { ...x, extraX: Number(e.target.value) } : x))
                                    )
                                  }
                                />
                              </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button
                                className="px-2 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-xs mr-1"
                                onClick={() => {
                                  const monto = Number(prompt("Monto del préstamo:", "0"));
                                  if (!monto || isNaN(monto)) return;
                                  const descripcion = prompt("Descripción o motivo:", "") || "";
                                  agregarPrestamo(emp.id, monto, descripcion);
                                }}
                                title="Registrar préstamo"
                                aria-label="Registrar préstamo"
                              >
                                💵
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-xs"
                                onClick={() =>
                                  setEmpleados((prev) => prev.filter((x) => x.id !== emp.id))
                                }
                                title="Eliminar empleado"
                                aria-label="Eliminar empleado"
                              >
                                🗑️
                              </button>
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
                        {prestamos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center opacity-70">
                              Sin préstamos registrados.
                            </td>
                          </tr>
                        ) : (
                          prestamos.map((p) => {
                            const emp = empleados.find((e) => e.id === p.empleadoId);
                            return (
                              <tr key={p.id} className="even:bg-white/60 dark:even:bg-white/5">
                                <td className="px-3 py-2">{emp?.nombre ?? "Desconocido"}</td>
                                <td className="px-3 py-2 text-right">${fmt(p.monto)}</td>
                                <td className="px-3 py-2">{p.descripcion || "—"}</td>
                                <td className="px-3 py-2 text-sm opacity-70">
                                  {new Date(p.fechaISO).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    className="px-2 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-xs"
                                    onClick={() => eliminarPrestamo(p.id)}
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
        </main>
      </div>
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
