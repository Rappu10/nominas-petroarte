import mongoose from "mongoose";

const CheckinSchema = new mongoose.Schema({
  empleadoId: { type: mongoose.Schema.Types.ObjectId, ref: "Empleado" },
  nombre: { type: String, required: true },
  dia: { type: String, required: true },
  horaEntrada: { type: String, default: "00:00" },
  horaSalida: { type: String, default: "00:00" },
  horasTotales: { type: Number, default: 0 },
  fecha: { type: Date, default: Date.now },
  semana: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Checkin", CheckinSchema);