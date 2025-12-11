import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import File from "../models/File.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ single uploads folder (configurable via .env UPLOADS_DIR; defaults to project-root /uploads)
const uploadsDir = path.resolve(
  __dirname,
  process.env.UPLOADS_DIR ? process.env.UPLOADS_DIR : "../../uploads"
);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || "20", 10);
const maxBytes = maxFileSizeMB * 1024 * 1024;

const allowed = (process.env.ALLOWED_MIME || "application/pdf,video/mp4")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ---- Multer config ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, "_");
    cb(null, `${safeBase}_${Date.now()}_${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type. Only PDF and MP4 allowed."));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxBytes },
}).single("file");

// ---- Routes ----

// POST /api/upload?privacy=public|private
router.post("/upload", authRequired, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: `File too large. Max ${maxFileSizeMB}MB.` });
      }
      if (/Unsupported file type/i.test(err.message || "")) {
        return res
          .status(415)
          .json({ error: "Unsupported file type. Only PDF and MP4 allowed." });
      }
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const privacy =
      (req.query.privacy || "public").toLowerCase() === "private"
        ? "private"
        : "public";

    try {
      const shareId = privacy === "private" ? uuidv4() : undefined;
      const doc = await File.create({
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: "/uploads/" + req.file.filename, // URL path for static serving
        size: req.file.size,
        privacy,
        uploaded_by: req.user.id,
        shareId,
      });

      return res.status(201).json({
        message: "Uploaded",
        file: {
          id: doc._id,
          originalName: doc.originalName,
          privacy: doc.privacy,
          size: doc.size,
          shareLink: doc.shareId
            ? `/api/files/share/${doc.shareId}/download`
            : null,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });
});

// GET /api/public-files  (visible to everyone; only public)
router.get("/public-files", async (req, res) => {
  const rows = await File.find({ privacy: "public" })
    .sort({ uploaded_at: -1 })
    .select("_id originalName size uploaded_at path");

  // include both id and _id to be UI-friendly (won't break either way)
  const files = rows.map((f) => ({
    id: f._id,
    _id: f._id,
    originalName: f.originalName,
    size: f.size,
    uploaded_at: f.uploaded_at,
    path: f.path,
  }));

  res.json({ files });
});

// GET /api/my-files  (owner-only listing; requires auth)
router.get("/my-files", authRequired, async (req, res) => {
  const files = await File.find({ uploaded_by: req.user.id }).sort({
    uploaded_at: -1,
  });
  res.json({
    files: files.map((f) => ({
      id: f._id,
      originalName: f.originalName,
      size: f.size,
      privacy: f.privacy,
      uploaded_at: f.uploaded_at,
      path: f.path,
      shareLink: f.shareId
        ? `/api/files/share/${f.shareId}/download`
        : null,
    })),
  });
});

// helper: safe download headers + path resolve
function streamDownload(res, fileDoc) {
  const full = path.resolve(uploadsDir, path.basename(fileDoc.path));
  if (!fs.existsSync(full)) return { ok: false, status: 410 };

  const contentType = mime.lookup(full) || "application/octet-stream";
  const safeName = String(fileDoc.originalName || "file")
    .replace(/[\r\n"]/g, "");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  fs.createReadStream(full).pipe(res);
  return { ok: true };
}

// GET /api/files/:id/download
// - public file: anyone
// - private file: only owner (via Bearer token) OR use the share link endpoint
router.get("/files/:id/download", async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) return res.status(404).json({ error: "Not found" });

  if (file.privacy === "private") {
    // Check Bearer token and owner
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(403).json({ error: "Forbidden (private file)" });

    try {
      const jwt = await import("jsonwebtoken");
      const payload = jwt.default.verify(token, process.env.JWT_SECRET);
      if (String(file.uploaded_by) !== String(payload.id)) {
        return res.status(403).json({ error: "Forbidden (not owner)" });
      }
    } catch {
      return res.status(403).json({ error: "Forbidden (invalid token)" });
    }
  }

  const out = streamDownload(res, file);
  if (!out.ok) return res.status(out.status).json({ error: "File missing from server" });
});

// GET /api/files/share/:shareId/download  (private via share link; no auth)
router.get("/files/share/:shareId/download", async (req, res) => {
  const file = await File.findOne({ shareId: req.params.shareId });
  if (!file) return res.status(404).json({ error: "Invalid link" });
  if (file.privacy !== "private")
    return res.status(400).json({ error: "Share link only for private files" });

  const out = streamDownload(res, file);
  if (!out.ok) return res.status(out.status).json({ error: "File missing from server" });
});

// DELETE /api/files/:id  (owner only)
router.delete("/files/:id", authRequired, async (req, res) => {
  const id = req.params.id;
  const file = await File.findById(id);
  if (!file) return res.status(404).json({ error: "Not found" });
  if (String(file.uploaded_by) !== String(req.user.id)) {
    return res.status(403).json({ error: "Not owner" });
  }

  const full = path.resolve(uploadsDir, path.basename(file.path));
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
    await File.deleteOne({ _id: id });
    res.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
