import express from "express";
import mongoose from "mongoose";
import cors from "cors";
const path = require("path");
const config = require(path.join(__dirname, "config.ts"));
const { MONGO_URI, PORT } = config;

import empleadosRoutes from "./routes/empleados.js";
import prestamosRoutes from "./routes/prestamos.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/empleados", empleadosRoutes);
app.use("/api/prestamos", prestamosRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    const empleadosRouter = require("./routes/empleados").default;
    app.use("/api/empleados", empleadosRouter);
    app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));
  })
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));