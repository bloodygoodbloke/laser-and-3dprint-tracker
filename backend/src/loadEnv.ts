import path from "path";
import dotenv from "dotenv";

const backendRoot = path.resolve(__dirname, "..");

// Load shared defaults first, then allow backend-local overrides.
dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true });
