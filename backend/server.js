import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./src/routes/auth.js";
import filesRouter from "./src/routes/files.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/secure_files";

// Static serving of uploads (do NOT list directory automatically)
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), { redirect: false }));

// Routes
app.use("/api", authRouter);
app.use("/api", filesRouter);

// Health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// DB connect + start
mongoose.connect(MONGO_URI).then(() => {
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}).catch(err => {
  console.error("MongoDB connection error", err);
  process.exit(1);
});
