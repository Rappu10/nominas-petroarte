import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { MONGO_URI, PORT } from "./config";
import empleadosRoutes from "./routes/empleados";
import prestamosRoutes from "./routes/prestamos";
import nominasRoutes from "./routes/nominas";
import checkinsRoutes from "./routes/checkins";

const app = express();

// ✅ CONFIGURACIÓN CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",             // desarrollo local
      "https://nominas-petroarte.vercel.app", // dominio vercel
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // 👈 importante para evitar el error
  })
);

app.use(express.json());

// ✅ Rutas API
app.use("/api/empleados", empleadosRoutes);
app.use("/api/prestamos", prestamosRoutes);
app.use("/api/nominas", nominasRoutes);
app.use("/api/checkins", checkinsRoutes);

// ✅ Conexión a MongoDB y arranque
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
  })
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));