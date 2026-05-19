import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";

import prisma from "./config/prisma.js";

// Routes
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import aiRoutes from "./routes/ai.routes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

import CATEGORIES from "./constants/categories.js";

const app = express();

app.use(cors({
  origin: "http://localhost:3001",
  credentials: true
}));
app.use(express.json());

// static files
app.use("/uploads", express.static(path.resolve("uploads")));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);

// AI route
app.use("/ai", aiRoutes);

// --------------------
// Sync categories
// --------------------
async function syncCategories() {
  console.log("🔄 Syncing categories...");

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("✅ Categories synchronized");
}

// Start server
syncCategories().then(() => {
  app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
  });
});