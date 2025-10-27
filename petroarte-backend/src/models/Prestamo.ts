import { Schema, model } from "mongoose";

const prestamoSchema = new Schema(
  {
    empleadoId: { type: String, required: true },
    monto: { type: Number, required: true },
    descripcion: { type: String },
    pagado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("Prestamo", prestamoSchema);