const prisma = require('../config/prisma');


// create an offer
exports.createOffer = async (req, res) => {
    try {
        const { title, description, location, salary, categoryId } = req.body;
        
        // 1. Check if the user is allowed (Admin or HR)
        if (req.user.role === 'CANDIDAT') {
            return res.status(403).json({ error: "Les candidats ne peuvent pas publier d'offres." });
        }

        // 2. Get the user's companyId (we need to find the user in DB first)
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user.companyId) {
            return res.status(400).json({ error: "Vous devez être lié à une entreprise pour publier." });
        }

        // 3. Create the Job
        const jobOffer = await prisma.job.create({
            data: {
                title,
                description,
                location,
                salary,
                authorId: req.user.id,        // The person logged in
                companyId: user.companyId,    // Their company
                categoryId: parseInt(categoryId) // The industry category
            }
        });

        res.status(201).json({
            message: "Offre d'emploi créée avec succès",
            jobOffer,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la création de l'offre" });
    }
};