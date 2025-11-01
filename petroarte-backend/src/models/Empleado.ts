import { Schema, model } from "mongoose";

const empleadoSchema = new Schema(
  {
    nombre: { type: String, required: true },
    puesto: { type: String, required: true },
    area: { type: String, required: true },
    estatus: { type: String, enum: ["Activo", "Baja"], default: "Activo" },
    tarifa: { type: Number, required: true },
    extraX: { type: Number, default: 1. },
    tipoPago: { type: String, enum: ["Por horas", "Semanal fijo"], default: "Por horas" },
    pagoSemanal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model("Empleado", empleadoSchema);