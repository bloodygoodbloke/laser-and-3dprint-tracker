# 🔥 Laser & 3D Print Job Tracker  
A full‑stack web application for managing laser cutting and 3D printing jobs, tracking materials, calculating costs, and monitoring production workflow.

This project is designed to help learn:
- VS Code  
- GitHub  
- GitHub Copilot  
- Docker  
- Full‑stack development workflow  

---

## 🚀 Project Goals
Build a production‑ready tool that supports:

- Job creation and tracking  
- File uploads (SVG, DXF, STL, 3MF)  
- Material inventory management  
- Automatic cost calculation  
- Dashboard with job + material summaries  
- Dockerised deployment  
- Clean API + modern frontend  

---

## 🧱 Tech Stack

### Backend
- Node.js  
- Express  
- Prisma ORM  
- SQLite (simple) or PostgreSQL (Docker)

### Frontend
- React + Vite  
- TailwindCSS

### Infrastructure
- Docker  
- Docker Compose  
- Nginx (optional)

---

## 📁 Folder Structure
laser-and-3dprint-tracker/
│
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── jobs.ts
│   │   │   ├── materials.ts
│   │   │   └── costs.ts
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── uploads/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── App.tsx
│   ├── public/
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md

---

## 🗄 Database Schema (Prisma)

Create this in `backend/prisma/schema.prisma`:

```prisma
model Job {
  id              Int      @id @default(autoincrement())
  name            String
  customer        String?
  filePath        String?
  material        Material? @relation(fields: [materialId], references: [id])
  materialId      Int?
  machineType     String
  estTimeMinutes  Int
  status          String    @default("Pending")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  cost            JobCost?
}

model Material {
  id               Int      @id @default(autoincrement())
  name             String
  type             String
  unit             String
  costPerUnit      Float
  stockLevel       Float
  reorderThreshold Float
  jobs             Job[]
}

model JobCost {
  id              Int     @id @default(autoincrement())
  jobId           Int     @unique
  materialCost    Float
  electricityCost Float
  labourCost      Float
  overheadCost    Float
  totalCost       Float
  job             Job     @relation(fields: [jobId], references: [id])
}
### API Endpoints

```http
# Jobs
GET    /jobs
POST   /jobs
GET    /jobs/:id
PUT    /jobs/:id
DELETE /jobs/:id
POST   /jobs/:id/upload

# Materials
GET    /materials
POST   /materials
PUT    /materials/:id
DELETE /materials/:id

# Cost calculation
POST /jobs/:id/calculate-cost
```

### Cost calculation examples

3D printing:

```text
materialCost    = gramsUsed * costPerGram
electricityCost = (printTimeMinutes / 60) * kWhRate * (printerWattage / 1000)
labourCost      = (printTimeMinutes / 60) * labourRate
subtotal        = materialCost + electricityCost + labourCost
overheadCost    = subtotal * overheadPercent
totalCost       = subtotal + overheadCost
```

Laser cutting:

```text
materialCost    = sheetCost OR (areaUsed * costPerArea)
electricityCost = (laserMinutes / 60) * (laserWattage / 1000) * kWhRate
labourCost      = (laserMinutes / 60) * labourRate
subtotal        = materialCost + electricityCost + labourCost
overheadCost    = subtotal * overheadPercent
totalCost       = subtotal + overheadCost
```

Notes:
- Keep units consistent (grams, minutes, kWh, currency).
- Store configurable rates in environment variables: `KWH_RATE`, `LABOUR_RATE`, `OVERHEAD_PERCENT`, `PRINTER_WATTAGE`, `LASER_WATTAGE`.

Frontend Pages
Dashboard
• Jobs in progress
• Low stock materials
• Quick add job
Jobs List
• Table view
• Filters
• Status badges
Job Detail
• File preview (SVG/STL viewer)
• Cost breakdown
• Status update buttons
Materials
• CRUD
• Stock alerts
Reports
• Monthly totals
• Profit vs cost
• Material usage
---
🐳 Docker Setup
The project must include:
• Dockerfile for backend
• Dockerfile for frontend
• docker-compose.yml with:
	◦ backend service
	◦ frontend service
	◦ database (SQLite file or Postgres container)
---
✔️ Acceptance Criteria
The app must support:
• Creating jobs
• Uploading files
• Tracking materials
• Auto cost calculation
• Dashboard summaries
• Full Dockerised environment
• Clean API
• Modern UI

Next Steps for Development
1. Scaffold backend Express server
2. Implement Prisma schema + migrations
3. Build React frontend with Tailwind
4. Add Dockerfiles
5. Add docker-compose.yml
6. Build UI pages
7. Add cost calculator
8. Add material tracking
9. Add dashboard
---
📌 Notes for GitHub Copilot
Copilot should generate:
• Backend boilerplate
• Frontend boilerplate
• API routes
• Controllers
• React components
• Docker configuration
• Utility functions
• File upload handling
• Cost calculation logic


---


