import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { MONGO_URI, PORT } from "./config";
import empleadosRoutes from "./routes/empleados";
import prestamosRoutes from "./routes/prestamos";
import nominasRoutes from "./routes/nominas";
import checkinsRoutes from "./routes/checkins";

const app = express();

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ??
  "http://localhost:5173,https://nominas-petroarte.vercel.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// ✅ CONFIGURACIÓN CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Permitir herramientas como Postman (sin origin) y logging para diagnósticos
      console.warn(`[CORS] Bloqueado origen no permitido: ${origin}`);
      return callback(new Error("Origen no permitido por CORS"));
    },
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
