import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

// 📘 Esquema de Checkins
const CheckinSchema = new mongoose.Schema({
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado" },
  nombre: { type: String, required: true },
  dia: { type: String, required: true },
  horaEntrada: { type: String, default: "00:00" },
  horaSalida: { type: String, default: "00:00" },
  horasTotales: { type: Number, default: 0 },
  semana: { type: String, default: "" },
  fecha: { type: Date, default: Date.now },
});

// 📘 Modelo
const Checkin = mongoose.models.Checkin || mongoose.model("Checkin", CheckinSchema);

// 🔹 GET — listar check-ins
router.get("/", async (_, res) => {
  try {
    const checkins = await Checkin.find().sort({ fecha: -1 });
    res.json(checkins);
  } catch (error) {
    console.error("❌ Error al obtener check-ins:", error);
    res.status(500).json({ error: "Error interno al obtener check-ins" });
  }
});

// 🔹 POST — guardar varios check-ins
router.post("/", async (req, res) => {
  try {
    const { registros } = req.body;
    if (!Array.isArray(registros))
      return res.status(400).json({ error: "Debe enviarse un arreglo de registros" });

    const result = await Checkin.insertMany(registros);
    res.json({ message: "✅ Check-ins guardados correctamente", data: result });
  } catch (error) {
    console.error("❌ Error al guardar check-ins:", error);
    res.status(500).json({ error: "Error interno al guardar check-ins" });
  }
});

// 🔹 POST — cerrar semana (resumen por empleado)
router.post("/cerrar-semana", async (req, res) => {
  try {
    const semanaInput: unknown = req.body?.semana;
    if (typeof semanaInput !== "string" || !semanaInput.trim()) {
      return res.status(400).json({ error: "Debe enviar el nombre de la semana." });
    }

    const semana = semanaInput.trim();
    const registros = await Checkin.find({ semana }).sort({ nombre: 1, fecha: 1 });

    if (!registros.length) {
      return res.status(404).json({
        error: `No hay registros de check-in para la semana "${semana}".`,
      });
    }

    type Resumen = { horasTotales: number; registros: number };
    const resumen = new Map<string, Resumen>();

    registros.forEach((registro) => {
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

    res.json({
      message: `Semana "${semana}" cerrada correctamente.`,
      semana,
      totalRegistros: registros.length,
      totalEmpleados: empleados.length,
      empleados,
    });
  } catch (error) {
    console.error("❌ Error al cerrar semana de check-ins:", error);
    res.status(500).json({ error: "Error interno al cerrar la semana de check-ins." });
  }
});

export default router;
