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

// Resolve current file/folder paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Load environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/secure_files";

// ✅ Use single uploads folder (outside backend)
// Reads from .env → UPLOADS_DIR=../../uploads
const UPLOADS_DIR = path.resolve(__dirname, process.env.UPLOADS_DIR || "../uploads");

// Serve uploaded files without directory listing
app.use("/uploads", express.static(UPLOADS_DIR, { redirect: false }));

// Routes
app.use("/api", authRouter);
app.use("/api", filesRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Database connect and start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
