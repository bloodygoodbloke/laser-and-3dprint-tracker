import express from "express";
import cors from "cors";
import jobsRouter from "./routes/jobs";
import materialsRouter from "./routes/materials";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRouter);
app.use("/api/materials", materialsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
