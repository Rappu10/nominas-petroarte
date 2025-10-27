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

export default router;