import express from "express";
import Empleado from "../models/Empleado";

const router = express.Router();

// Obtener todos
router.get("/", async (_req, res) => {
  const empleados = await Empleado.find().sort({ createdAt: -1 });
  res.json(empleados);
});

// Crear nuevo
router.post("/", async (req, res) => {
  try {
    const nuevo = new Empleado(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: "No se pudo crear empleado", details: err });
  }
});

// Actualizar
router.put("/:id", async (req, res) => {
  try {
    const upd = await Empleado.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: "No se pudo actualizar", details: err });
  }
});

// Eliminar
router.delete("/:id", async (req, res) => {
  try {
    await Empleado.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "No se pudo eliminar", details: err });
  }
});

export default router;