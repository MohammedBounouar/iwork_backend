const prisma = require('../config/prisma');

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
exports.applyJob = async (req, res) => {
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