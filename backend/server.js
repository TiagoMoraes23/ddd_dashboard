import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import pacienteRoutes from "./routes/pacienteRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js"; 
import cirurgiaRoutes from "./routes/cirurgiaRoutes.js";

import { protect, admin } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado!"))
  .catch((err) => console.error("Erro ao conectar MongoDB:", err));

app.get("/", (req, res) => res.send("API do Dashboard Consultório 2.0 está a funcionar."));
app.use("/api/auth", authRoutes);

app.use("/api/pacientes", protect, pacienteRoutes);
app.use("/api/dashboard", protect, dashboardRoutes); 
app.use("/api/cirurgias", protect, cirurgiaRoutes);

app.use("/api/users", protect, admin, userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor 2.0 a rodar na porta ${PORT}`));
