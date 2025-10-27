import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { MONGO_URI, PORT } from "./config";
import empleadosRoutes from "./routes/empleados";
import prestamosRoutes from "./routes/prestamos";
import nominasRoutes from "./routes/nominas";
import checkinsRoutes from "./routes/checkins";

const app = express();

// ✅ Configuración CORS correcta (con credenciales)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173"); // o tu dominio de frontend si lo subes
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

// ✅ Rutas API
app.use("/api/empleados", empleadosRoutes);
app.use("/api/prestamos", prestamosRoutes);
app.use("/api/nominas", nominasRoutes);
app.use("/api/checkins", checkinsRoutes);

// ✅ Conexión MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
  })
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));