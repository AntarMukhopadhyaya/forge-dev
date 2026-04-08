import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
dotenv.config();
const app = express();
const port = Number(process.env.PORT ?? "{{apiPort}}");
const mongoUri = process.env.MONGODB_URI ?? "{{mongoUri}}";
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: clientOrigin }));
app.use(express.json());
app.use(morgan("dev"));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
start();
