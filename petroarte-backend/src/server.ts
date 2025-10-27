import express from "express";
import mongoose from "mongoose";
import { MONGO_URI, PORT } from "./config";

import empleadosRoutes from "./routes/empleados";
import prestamosRoutes from "./routes/prestamos";

const app = express();


app.use(express.json());

app.use("/api/empleados", empleadosRoutes);
app.use("/api/prestamos", prestamosRoutes);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () =>
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
    );
  })
  .catch((err: unknown) => console.error("❌ Error al conectar MongoDB:", err));