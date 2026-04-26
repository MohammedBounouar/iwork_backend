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

// update an offer
exports.updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, location, salary, categoryId } = req.body;

        // 1. Authorization check: Block Candidates
        if (req.user.role === 'CANDIDAT') {
            return res.status(403).json({ error: "Accès refusé." });
        }

        // 2. Find the existing job to check ownership
        const existingJob = await prisma.job.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingJob) {
            return res.status(404).json({ error: "Offre introuvable." });
        }

        // 3. Get user details (including companyId)
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        // 4. Check if the user belongs to the company that owns the job
        if (user.companyId !== existingJob.companyId) {
            return res.status(403).json({ error: "Vous n'avez pas la permission de modifier cette offre." });
        }

        // 5. Perform the update
        const jobOffer = await prisma.job.update({
            where: { id: parseInt(id) },
            data: {
                title,
                description,
                location,
                salary,
                // Note: We use undefined for fields that might be missing in req.body 
                // so Prisma doesn't overwrite them with nulls.
                categoryId: categoryId ? parseInt(categoryId) : undefined
            }
        });

        res.status(200).json({
            message: "Offre d'emploi modifiée avec succès",
            jobOffer,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur lors de la modification" });
    }
};

// Get all offers for "jobs Feed" + Global Keyword Search
exports.getAllOffers = async (req, res) => {
    try {
        const { category, search } = req.query;

        const offers = await prisma.job.findMany({
            where: {
                isActive: true,
                // 1. Filter by category if provided
                ...(category && { categoryId: parseInt(category) }),
                
                // 2. Global Keyword Search
                ...(search && {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { location: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            include: {
                company: { select: { name: true, logo: true } },
                category: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(offers);
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ error: "Erreur lors de la recherche." });
    }
};

/**
 * @desc    Récupère toutes les offres actives d'une entreprise spécifique
 * @route   GET /api/jobs/company/:companyId
 */

exports.getOffersByCompany = async (req, res) => {
    try {
        // On récupère l'ID depuis les params pour une URL propre : /company/5
        const { companyId } = req.params; 

        if (!companyId) {
            return res.status(400).json({ error: "L'ID de l'entreprise est requis." });
        }

        const offers = await prisma.job.findMany({
            where: {
                companyId: parseInt(companyId),
                isActive: true // On ne montre que ce qui est en ligne
            },
            include: {
                category: { select: { name: true } },
                company: { select: { name: true, logo: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(offers);
    } catch (error) {
        console.error("Error fetching company offers:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des offres." });
    }
};

//delete an offer by id
exports.deleteOffer = async (req, res) => {
    try {
        
        const jobId = parseInt(req.params.id); 

        
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return res.status(404).json({ error: "Offre non trouvée." });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (user.role === 'CANDIDAT' || user.companyId !== job.companyId) {
            return res.status(403).json({ error: "Accès refusé. Vous ne pouvez pas supprimer cette offre." });
        }

        // 4. Perform the delete
        await prisma.job.delete({
            where: { id: jobId }
        });

        res.status(200).json({ message: "Offre d'emploi supprimée avec succès" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la suppression de l'offre" });
    }
};