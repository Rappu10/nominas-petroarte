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
      const registros = empleados.map((emp: any) => ({
        ...emp,
        semana,
        fechaRegistro: new Date(),
      }));
      const result = await Nomina.insertMany(registros);
      return res.json(result);
    }

    // Si es un solo registro
    const nuevaNomina = new Nomina(req.body);
    const saved = await nuevaNomina.save();
    res.json(saved);
  } catch (err) {
    console.error("❌ Error al guardar nómina:", err);
    res.status(500).json({ error: "Error al guardar nómina" });
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