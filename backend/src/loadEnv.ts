import path from "path";
import dotenv from "dotenv";

const backendRoot = path.resolve(__dirname, "..");

// Load shared defaults first, then allow backend-local overrides.
dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true });

// Local default keeps the pre-existing dev database; production sets DATABASE_URL=file:/data/makerflow.db.
process.env.DATABASE_URL ??= "file:./dev.db";
