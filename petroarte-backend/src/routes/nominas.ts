import { Router } from "express";
import Nomina from "../models/Nomina";

const router = Router();

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

    // Si viene un arreglo de empleados, los guardamos individualmente
    if (Array.isArray(empleados)) {
      const now = new Date();
      const result = await Promise.all(
        empleados.map(async (emp: any) => {
          const filtro: Record<string, unknown> = {
            nombre: emp.nombre,
          };
          if (semana) filtro.semana = semana;
          return Nomina.findOneAndUpdate(
            filtro,
            {
              ...emp,
              semana,
              fechaRegistro: now,
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        })
      );
      return res.json(result);
    }

    // Si es un solo registro, también lo sobreescribimos
    const filtroUnico: Record<string, unknown> = {
      nombre: req.body?.nombre,
    };
    if (req.body?.semana) filtroUnico.semana = req.body.semana;
    const saved = await Nomina.findOneAndUpdate(
      filtroUnico,
      { ...req.body, fechaRegistro: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
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
    const { descuentos, pendiente_descuento } = req.body ?? {};

    const update: Record<string, unknown> = {};
    if (descuentos !== undefined) update.descuentos = descuentos;
    if (pendiente_descuento !== undefined) update.pendiente_descuento = pendiente_descuento;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
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
router.delete("/all", async (req, res) => {
  try {
    await Nomina.deleteMany({});
    res.json({ message: "Todas las nóminas eliminadas" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar nóminas" });
  }
});

export default router;
