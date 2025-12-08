import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  privacy: { type: String, enum: ["public", "private"], default: "public" },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploaded_at: { type: Date, default: Date.now },
  shareId: { type: String, index: true } // only used for private files
});

export default mongoose.model("File", fileSchema);
