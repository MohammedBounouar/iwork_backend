const prisma = require('../config/prisma');

//fill compnay informations
exports.createCompany = async (req, res) => {
    try {
        const { name, description, location, website } = req.body;
        
        // Safety check: ensure authMiddleware worked
        if (!req.user) {
            return res.status(401).json({ error: "Utilisateur non authentifié" });
        }
        
        const adminId = req.user.id;
        if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: "Accès refusé. Seuls les Admins peuvent créer une entreprise." });
}
        const logoPath = req.file ? `/uploads/logos/${req.file.filename}` : null;

        const company = await prisma.company.create({
            data: {
                name,
                description,
                location,
                website,
                logo: logoPath,
                users: {
                    connect: { id: adminId }
                }
            }
        });

        res.status(201).json(company);
    } catch (error) {
        // Logging the error is the only way to know if it's a DB error or a path error
        console.error("Prisma Error:", error);
        res.status(500).json({ 
            error: "Erreur lors de la création", 
            details: error.message // This will help you find the problem
        });
    }
};

//search compnay by name
exports.searchCompany = async (req, res) => {
    try {
        const { name } = req.params;
        

        const company = await prisma.company.findFirst({
            where: { name: {equals: name}},
            select: {
                id: true,
                name: true,
                description: true,
                location: true,
                website: true,
                logo: true,
            }
        });

        if (!company) {
            return res.status(404).json({ error: "Entreprise non trouvée" });
        }

        res.status(200).json(company);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la recherche" });
    }
};