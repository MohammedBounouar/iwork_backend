import prisma from '../config/prisma.js';

/**
 * @desc    Permet à un candidat de postuler à une offre
 * @route   POST /api/applications/apply
 * @access  Private (Candidat uniquement)
 */
/**
 * @desc    Permet à un candidat de postuler à une offre en utilisant son CV de profil
 * @route   POST /api/applications/apply
 * @access  Private (Candidat uniquement)
 */
export const applyJob = async (req, res) => {
    try {
        const { jobId } = req.body;
        const candidateId = req.user.id;

        // 1. Role Check
        if (req.user.role !== 'CANDIDAT') {
            return res.status(403).json({ error: "Seuls les candidats peuvent postuler." });
        }

        // 2. Récupérer l'utilisateur pour vérifier s'il a un CV
        const user = await prisma.user.findUnique({ 
            where: { id: candidateId },
            select: { curriculum_vitae: true } // On ne récupère que ce qu'on a besoin
        });

        if (!user || !user.curriculum_vitae) {
            return res.status(400).json({
                error: "Action requise",
                message: "Vous devez uploader un CV dans votre profil avant de pouvoir postuler."
            });
        }

        // 3. Prevent Duplicates (Éviter de postuler deux fois à la même offre)
        const alreadyApplied = await prisma.application.findFirst({
            where: { 
                jobId: parseInt(jobId), 
                candidateId: candidateId 
            }
        });

        if (alreadyApplied) {
            return res.status(400).json({ error: "Vous avez déjà postulé à cette offre." });
        }

        // 4. Create Application 
        const application = await prisma.application.create({
            data: {
                jobId: parseInt(jobId),
                candidateId: candidateId,
                cvUrl: user.curriculum_vitae,
                status: "PENDING"
            }
        });

        res.status(201).json({ 
            message: "Candidature envoyée avec succès !", 
            application 
        });

    } catch (error) {
        console.error("Apply Job Error:", error);
        res.status(500).json({ error: "Erreur serveur lors de la postulation." });
    }
};

/**
 * @desc    Récupère les candidatures du département de l'HR connecté
 * @route   GET /api/applications/my-department
 */

export const getDepartmentApplications = async (req, res) => {
    try {
        const hr = req.user; // L'utilisateur connecté (Admin ou HR)

        // Si c'est un Admin, il voit tout de l'entreprise
        // Si c'est un HR, on filtre par son département (assignedCategoryId)
        const whereClause = {
            companyId: hr.companyId,
            ...(hr.role === 'HR' && { 
                job: { categoryId: hr.assignedCategoryId } 
            })
        };

        const applications = await prisma.application.findMany({
            where: whereClause,
            include: {
                candidate: {
                    select: { firstName: true, lastName: true, email: true, curriculum_vitae: true }
                },
                job: {
                    select: { title: true, category: true }
                }
            },
            orderBy: { appliedAt: 'desc' }
        });

        res.status(200).json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la récupération des candidatures." });
    }
};


/**
 * @desc    Mettre à jour le statut d'une candidature (Accepté/Refusé)
 * @route   PATCH /api/applications/:id/status
 */
export const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "accepted", "rejected", "reviewed"
        const hr = req.user;

        // 1. Trouver la candidature avec les infos du job
        const application = await prisma.application.findUnique({
            where: { id: parseInt(id) },
            include: { job: true }
        });

        if (!application) {
            return res.status(404).json({ error: "Candidature non trouvée." });
        }

        // 2. Vérification de sécurité : 
        // L'HR doit appartenir à la même entreprise que le Job
        if (application.job.companyId !== hr.companyId) {
            return res.status(403).json({ error: "Vous n'avez pas l'autorisation pour cette entreprise." });
        }

        // 3. (Optionnel) Vérification du département :
        // Si c'est un RH (pas Admin), il ne peut modifier que son département
        if (hr.role === 'HR' && application.job.categoryId !== hr.assignedCategoryId) {
            return res.status(403).json({ error: "Ce candidat appartient à un autre département." });
        }

        // 4. Mise à jour
        const updatedApplication = await prisma.application.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.status(200).json({ 
            message: `Candidature marquée comme ${status}`, 
            updatedApplication 
        });

    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la mise à jour du statut." });
    }
};