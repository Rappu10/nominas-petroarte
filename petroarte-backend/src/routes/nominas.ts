import { Router } from "express";
import Nomina, { INomina } from "../models/Nomina";

const router = Router();

type NominaPayload = Partial<Omit<INomina, "_id">> & {
  nombre?: string;
  semana?: string;
};

// Obtener todas las nóminas
router.get("/", async (req, res) => {
  try {
    const data = await Nomina.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.error("❌ Error al obtener nóminas:", err);
    res.status(500).json({ error: "Error al obtener nóminas" });
  }
});

// Crear varias nóminas (una por empleado)
router.post("/", async (req, res) => {
  try {
    const { empleados, semana } = req.body;

    // Si viene un arreglo de empleados, los guardamos sin sobrescribir
    if (Array.isArray(empleados) && empleados.length > 0) {
      const now = new Date();
      const docs = empleados.map((emp: NominaPayload) => ({
        ...emp,
        semana: semana?.trim() || emp.semana?.trim() || "",
        fechaRegistro: now,
      }));
      const result = await Nomina.insertMany(docs);
      return res.json(result);
    }

    // Si es un solo registro, lo guardamos tal cual
    const payload: NominaPayload = {
      ...req.body,
      semana: semana?.trim() || req.body?.semana?.trim() || "",
      fechaRegistro: new Date(),
    };
    const saved = await Nomina.create(payload);
    res.json(saved);
  } catch (err) {
    console.error("❌ Error al guardar nómina:", err);
    res.status(500).json({ error: "Error al guardar nómina" });
  }
});

// Actualizar campos de una nómina existente
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const editableFields = [
      "total_horas",
      "horas_primarias",
      "horas_extras",
      "pago_semanal_base",
      "costo_hora_primaria",
      "total_horas_primarias",
      "pago_horas_primarias",
      "costo_hora_extra",
      "pago_horas_extras",
      "pago_semanal_calc",
      "descuentos",
      "pendiente_descuento",
      "total",
      "bono_semanal",
      "total_2",
      "bono_mensual",
      "comision",
      "total_con_bono_mensual",
      "extra",
      "total_final",
      "semana",
    ] as const;

    const update = Object.fromEntries(
      editableFields
        .filter((field) => field in body)
        .map((field) => [field, body[field]])
    );

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos válidos para actualizar" });
    }

    const updated = await Nomina.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Nómina no encontrada" });
    }
    res.json(updated);
  } catch (err) {
    console.error("❌ Error al actualizar nómina:", err);
    res.status(500).json({ error: "Error al actualizar nómina" });
  }
});

// Eliminar todas las nóminas (opcional, útil para limpiar)
router.delete("/all", async (_req, res) => {
  try {
    await Nomina.deleteMany({});
    res.json({ message: "Todas las nóminas eliminadas" });
  } catch (err) {
    console.error("❌ Error al eliminar todas las nóminas:", err);
    res.status(500).json({ error: "Error al eliminar nóminas" });
  }
});

// Eliminar todas las nóminas de una semana específica
router.delete("/semana/:semana", async (req, res) => {
  try {
    const { semana } = req.params;
    if (!semana || !semana.trim()) {
      return res.status(400).json({ error: "Semana inválida" });
    }
    const resultado = await Nomina.deleteMany({ semana });
    res.json({
      message: "Nóminas eliminadas",
      deletedCount: resultado.deletedCount ?? 0,
    });
  } catch (err) {
    console.error("❌ Error al eliminar nóminas por semana:", err);
    res.status(500).json({ error: "Error al eliminar nóminas por semana" });
  }
});

// Eliminar una nómina específica
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eliminada = await Nomina.findByIdAndDelete(id);
    if (!eliminada) {
      return res.status(404).json({ error: "Nómina no encontrada" });
    }
    res.json({ message: "Nómina eliminada" });
  } catch (err) {
    console.error("❌ Error al eliminar nómina:", err);
    res.status(500).json({ error: "Error al eliminar nómina" });
  }
});

export default router;
