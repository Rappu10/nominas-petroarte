import React, { useEffect, useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Section = "nominas" | "reportes" | "empleados";

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

export default function App() {
  const { dark, setDark } = useTheme();
  const [section, setSection] = useState<Section>("nominas");

  // ----- Datos -----
  const [rawData, setRawData] = useState<Row[]>([]);
  useEffect(() => {
    fetch("/nominas_merged_clean.json")
      .then((r) => r.json())
      .then((data: Row[]) => setRawData(data))
      .catch((err) => console.error("No se pudo cargar el JSON:", err));
  }, []);

  // Columnas y tipos
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

  // Hints columnas principales
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

  // Periodo (mes/fecha/año autodetectado)
  const [periodo, setPeriodo] = useState<string>("");
  const periodoCol = useMemo(() => {
    return (
      columns.find((c) => /(periodo|mes|fecha|anio|año)/i.test(c)) || ""
    );
  }, [columns]);

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

  const visibleCols = useMemo(() => columns.slice(0, 30), [columns]);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-neutral-900 dark:text-neutral-100">
      {/* SIDEBAR OSCURO */}
      <aside className="hidden md:flex w-64 flex-col bg-emerald-800 text-white p-5 gap-4">
        <div className="text-2xl font-bold tracking-tight">PetroArte</div>
        <nav className="mt-2 space-y-1 text-sm">
          <button
            onClick={() => setSection("nominas")}
            className={`w-full text-left px-3 py-2 rounded-lg transition ${
              section === "nominas" ? "bg-emerald-600" : "hover:bg-emerald-700"
            }`}
          >
            Nóminas
          </button>
          <button
            onClick={() => setSection("reportes")}
            className={`w-full text-left px-3 py-2 rounded-lg transition ${
              section === "reportes" ? "bg-emerald-600" : "hover:bg-emerald-700"
            }`}
          >
            Reportes
          </button>
          <button
            onClick={() => setSection("empleados")}
            className={`w-full text-left px-3 py-2 rounded-lg transition ${
              section === "empleados" ? "bg-emerald-600" : "hover:bg-emerald-700"
            }`}
          >
            Empleados
          </button>
        </nav>
        <div className="mt-auto text-xs text-emerald-50/80">
          © {new Date().getFullYear()} PetroArte
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {/* HEADER SUPERIOR */}
        <header className="bg-white dark:bg-neutral-950 border-b dark:border-neutral-800">
          <div className="px-4 md:px-6 py-3 flex items-center gap-3">
            <div className="md:hidden">
              <span className="font-bold">PetroArte</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-neutral-400">
              Panel de Gestión
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setDark(!dark)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm"
                title="Cambiar tema claro/oscuro"
              >
                {dark ? "🌙 Oscuro" : "☀️ Claro"}
              </button>
            </div>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="p-4 md:p-6 space-y-6">
          {section === "nominas" && (
            <>
              {/* TOOLBAR */}
              <div className="rounded-xl border bg-white dark:bg-neutral-950 dark:border-neutral-800 p-3 shadow-sm flex flex-wrap gap-3 items-center">
                <input
                  className="border rounded-lg px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-neutral-900 dark:border-neutral-700"
                  placeholder="Buscar en todo…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                />
                <select
                  className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
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
                  className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
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
                  className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
                  value={periodo}
                  onChange={(e) => {
                    setPeriodo(e.target.value);
                    setPage(0);
                  }}
                  disabled={!periodoCol}
                  title={periodoCol ? `Usando columna: ${periodoCol}` : "No se detectó columna de periodo"}
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
                  className="ml-auto px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
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

              {/* CARDS MÉTRICAS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 border border-emerald-200/40 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Registros {periodo ? `· ${periodo}` : ""}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {totalRegistros.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 border border-emerald-200/40 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Empleados únicos
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {empleadosUnicos.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 border border-emerald-200/40 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Suma ({amountCol || "monto"})
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {sumaMontos.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-4 border border-emerald-200/40 dark:border-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Hojas
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {hojasUnicas.toLocaleString()}
                  </p>
                </div>
              </section>

              {/* TABLA + TOP */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tabla */}
                <div className="lg:col-span-2">
                  {rawData.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      Cargando datos… asegúrate de tener{" "}
                      <code>public/nominas_merged_clean.json</code>
                    </p>
                  ) : (
                    <>
                      <div className="overflow-auto rounded-xl shadow bg-white dark:bg-neutral-800 border border-emerald-200/40 dark:border-neutral-700">
                        <table className="w-full text-sm">
                          <thead className="bg-emerald-600 text-white sticky top-0">
                            <tr>
                              {visibleCols.map((col) => (
                                <th
                                  key={col}
                                  className="px-3 py-2 text-left font-medium"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sliced.map((row, i) => (
                              <tr
                                key={i}
                                className={`${i % 2 ? "bg-gray-50 dark:bg-neutral-700/50" : "bg-white dark:bg-neutral-800"} hover:bg-emerald-50/60 dark:hover:bg-neutral-700 transition`}
                              >
                                {visibleCols.map((col) => (
                                  <td
                                    key={col}
                                    className="px-3 py-2 border-b border-gray-100 dark:border-neutral-700"
                                  >
                                    {String(row[col] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 dark:text-neutral-400">
                          {datosPeriodo.length.toLocaleString()} filas · página {page + 1} de {totalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-emerald-200/40 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                          >
                            Anterior
                          </button>
                          <button
                            className="px-3 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-emerald-200/40 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700"
                            onClick={() =>
                              setPage((p) => Math.min(totalPages - 1, p + 1))
                            }
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Top 15 */}
                <div className="rounded-xl shadow bg-white dark:bg-neutral-800 border border-emerald-200/40 dark:border-neutral-700 p-4">
                  <h2 className="font-semibold mb-3">
                    Top 15 por total ({amountCol || "monto"})
                    {periodo ? ` · ${periodo}` : ""}
                  </h2>
                  {!nameCol || !amountCol ? (
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      Selecciona columnas de nombre y monto.
                    </p>
                  ) : topTotales.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      Sin datos.
                    </p>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-1 text-sm">
                      {topTotales.map((t, idx) => (
                        <li key={idx} className="flex justify-between gap-4">
                          <span className="truncate">{t.name}</span>
                          <span className="font-mono">
                            {t.total.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </>
          )}

          {section === "reportes" && (
            <div className="rounded-xl shadow bg-white dark:bg-neutral-800 border border-emerald-200/40 dark:border-neutral-700 p-6">
              <h2 className="text-lg font-semibold">Reportes</h2>
              <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
                Exporta CSV por periodo, empleado o centro de costos. (Configuramos
                estos filtros cuando confirmes los campos exactos.)
              </p>
            </div>
          )}

          {section === "empleados" && (
            <div className="rounded-xl shadow bg-white dark:bg-neutral-800 border border-emerald-200/40 dark:border-neutral-700 p-6">
              <h2 className="text-lg font-semibold">Empleados</h2>
              <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
                Aquí podemos listar empleados únicos, buscar uno y ver su
                historial de nómina. (Se arma en cuanto confirmes la columna.)
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}