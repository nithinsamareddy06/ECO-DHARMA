import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  points: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  lastDay: { type: String, default: "" },
}, { timestamps: true });

const scanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  item: String, category: String, bin: String, tip: String,
  reuse: [String], points: Number, co2: Number,
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Scan = mongoose.model("Scan", scanSchema);
