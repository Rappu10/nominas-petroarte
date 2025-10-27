import express from "express";
import Prestamo from "../models/Prestamo";

const router = express.Router();

router.get("/", async (_req, res) => {
  const prestamos = await Prestamo.find().sort({ createdAt: -1 });
  res.json(prestamos);
});

router.post("/", async (req, res) => {
  try {
    const nuevo = new Prestamo(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: "No se pudo crear préstamo", details: err });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const upd = await Prestamo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: "No se pudo actualizar préstamo", details: err });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Prestamo.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "No se pudo eliminar préstamo", details: err });
  }
});

export default router;