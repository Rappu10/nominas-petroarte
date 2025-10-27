import mongoose, { Schema, Document } from "mongoose";

export interface INomina extends Document {
  nombre: string;
  total_horas: number;
  horas_primarias: number;
  horas_extras: number;
  pago_semanal_base: number;
  costo_hora_primaria: number;
  total_horas_primarias: number;
  pago_horas_primarias: number;
  costo_hora_extra: number;
  pago_horas_extras: number;
  pago_semanal_calc: number;
  descuentos: number;
  pendiente_descuento: number;
  total: number;
  bono_semanal: number;
  total_2: number;
  bono_mensual: number;
  comision: number;
  total_con_bono_mensual: number;
  extra?: string;
  total_final: number;
  semana?: string;
  fechaRegistro?: Date;
}

const NominaSchema = new Schema<INomina>(
  {
    nombre: { type: String, required: true },
    total_horas: Number,
    horas_primarias: Number,
    horas_extras: Number,
    pago_semanal_base: Number,
    costo_hora_primaria: Number,
    total_horas_primarias: Number,
    pago_horas_primarias: Number,
    costo_hora_extra: Number,
    pago_horas_extras: Number,
    pago_semanal_calc: Number,
    descuentos: Number,
    pendiente_descuento: Number,
    total: Number,
    bono_semanal: Number,
    total_2: Number,
    bono_mensual: Number,
    comision: Number,
    total_con_bono_mensual: Number,
    extra: String,
    total_final: Number,
    semana: String,
    fechaRegistro: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<INomina>("Nomina", NominaSchema);