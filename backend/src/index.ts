import express from "express";
import cors from "cors";
import path from "path";
import jobsRouter from "./routes/jobs";
import materialsRouter from "./routes/materials";
import billingRouter from "./routes/billing";
import adminRouter from "./routes/admin";
import customersRouter from "./routes/customers";
import suppliersRouter from "./routes/suppliers";
import bambuRouter from "./routes/bambu";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/billing-settings", billingRouter);
app.use("/api/customers", customersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/bambu", bambuRouter);
app.use("/api/admin", adminRouter);
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
