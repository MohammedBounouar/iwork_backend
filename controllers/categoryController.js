import prisma from '../config/prisma.js';
import CATEGORIES from '../constants/categories.js';


// Get All categories profile
export const getAllCategories = async (req, res) => {
    try {
        // Fetch from the DB (which was just synced by your constant file)
        const categories = await prisma.category.findMany({
            select: {
                id: true,
                name: true
            }
        });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
};
