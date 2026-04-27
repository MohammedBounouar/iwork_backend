require('dotenv').config(); // 1. Load env first
const express = require('express');
const path = require('path'); // 2. Required for static files
const prisma = require('./config/prisma'); // 3. Required for syncCategories

// Routes
const userRoutes = require('./routes/userRoutes'); 
const categoryRoutes = require('./routes/categoryRoutes'); 
const companyRoutes = require('./routes/companyRoutes'); 
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const CATEGORIES = require('./constants/categories');

const app = express();

// Middlewares
app.use(express.json());
// Serve the uploads folder so images are accessible via URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// Category Synchronization Logic
async function syncCategories() {
    console.log("🔄 Syncing categories...");
    for (const name of CATEGORIES) {
        await prisma.category.upsert({
            where: { name: name },
            update: {}, // If it exists, change nothing
            create: { name: name } // If it's missing, add it
        });
    }
    console.log("✅ Categories are synchronized.");
}

// Call this before app.listen
syncCategories().then(() => {
    app.listen(3000, () => console.log('Server running on port 3000'));
});