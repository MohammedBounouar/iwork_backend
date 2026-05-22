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
// export const applyJob = async (req, res) => {
//     try {
//         const { jobId } = req.body;
//         const candidateId = req.user.id;

//         // 1. Role Check
//         if (req.user.role !== 'CANDIDAT') {
//             return res.status(403).json({ error: "Seuls les candidats peuvent postuler." });
//         }

//         // 2. Récupérer l'utilisateur pour vérifier s'il a un CV
//         const user = await prisma.user.findUnique({ 
//             where: { id: candidateId },
//             select: { curriculum_vitae: true } // On ne récupère que ce qu'on a besoin
//         });

//         if (!user || !user.curriculum_vitae) {
//             return res.status(400).json({
//                 error: "Action requise",
//                 message: "Vous devez uploader un CV dans votre profil avant de pouvoir postuler."
//             });
//         }

//         // 3. Prevent Duplicates (Éviter de postuler deux fois à la même offre)
//         const alreadyApplied = await prisma.application.findFirst({
//             where: { 
//                 jobId: parseInt(jobId), 
//                 candidateId: candidateId 
//             }
//         });

//         if (alreadyApplied) {
//             return res.status(400).json({ error: "Vous avez déjà postulé à cette offre." });
//         }

//         // 4. Create Application 
//         const application = await prisma.application.create({
//             data: {
//                 jobId: parseInt(jobId),
//                 candidateId: candidateId,
//                 cvUrl: user.curriculum_vitae,
//                 status: "PENDING"
//             }
//         });

//         res.status(201).json({ 
//             message: "Candidature envoyée avec succès !", 
//             application 
//         });

//     } catch (error) {
//         console.error("Apply Job Error:", error);
//         res.status(500).json({ error: "Erreur serveur lors de la postulation." });
//     }
// };

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



// controllers/applicationController.js
import nodemailer from "nodemailer";

/* ─────────────────────────────────────────────────────────────────
   Email transporter — configure via environment variables:
   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
   (works with Gmail, SendGrid, Mailtrap, Resend, etc.)
───────────────────────────────────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST   || "smtp.gmail.com",
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true", // true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password if using Gmail 2FA
  },
});

/**
 * Sends a stylised HTML confirmation email to the candidate.
 */
async function sendConfirmationEmail({ to, candidateName, jobTitle, companyName }) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Candidature confirmée – iwork</title>
  <style>
    body { margin:0; padding:0; font-family:'DM Sans',Helvetica,Arial,sans-serif; background:#f5fafa; color:#333d42; }
    .wrapper { max-width:560px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:#333d42; padding:36px 40px; text-align:center; }
    .logo   { font-size:28px; font-weight:700; color:#ffffff; letter-spacing:2px; }
    .logo span { color:#2ec4b6; }
    .body   { padding:36px 40px; }
    .check-circle { width:72px; height:72px; border-radius:50%; background:#e6f9f8; margin:0 auto 24px; display:flex; align-items:center; justify-content:center; }
    h1 { font-size:22px; font-weight:700; margin:0 0 12px; text-align:center; }
    .job-card { background:#f5fafa; border:1.5px solid #e4eaee; border-radius:12px; padding:20px 24px; margin:24px 0; }
    .job-card .role { font-size:17px; font-weight:600; color:#333d42; margin-bottom:4px; }
    .job-card .company { font-size:14px; color:#8896a5; }
    .badge { display:inline-block; font-size:12px; font-weight:500; background:#e6f9f8; border:1px solid rgba(46,196,182,.25); color:#1fa89c; padding:4px 12px; border-radius:999px; margin-top:10px; }
    p { font-size:15px; line-height:1.7; color:#4a5568; }
    .cta { display:block; text-align:center; background:#2ec4b6; color:#ffffff !important; text-decoration:none; padding:15px 32px; border-radius:10px; font-size:15px; font-weight:600; margin:28px 0 0; }
    .footer { border-top:1px solid #e4eaee; padding:20px 40px; text-align:center; font-size:12px; color:#b0bec5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo"><span>i</span>work</div>
    </div>

    <div class="body">
      <!-- Checkmark -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding-bottom:20px;">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="width:72px;height:72px;background:#e6f9f8;border-radius:50%;text-align:center;vertical-align:middle;">
              <span style="font-size:32px;">✅</span>
            </td></tr>
          </table>
        </td></tr>
      </table>

      <h1>Candidature envoyée !</h1>

      <p style="text-align:center;">
        Bonjour <strong>${candidateName}</strong>, votre candidature a bien été reçue.
      </p>

      <div class="job-card">
        <div class="role">${jobTitle}</div>
        <div class="company">${companyName}</div>
        <span class="badge">📩 Candidature en cours d'examen</span>
      </div>

      <p>
        Notre équipe examinera votre profil et vous contactera dans les plus brefs délais.
        En attendant, n'hésitez pas à explorer d'autres opportunités sur iwork.
      </p>

      <a class="cta" href="${process.env.FRONTEND_URL || "http://localhost:3000"}">
        Voir d'autres offres →
      </a>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} iwork — Tous droits réservés<br/>
      Vous recevez cet email car vous avez postulé via iwork.ma
    </div>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from:    `"iwork" <${process.env.EMAIL_USER}>`,
    to,
    subject: `✅ Votre candidature pour "${jobTitle}" chez ${companyName} a été envoyée`,
    html,
  });
}

/* ─────────────────────────────────────────────────────────────────
   CONTROLLER
───────────────────────────────────────────────────────────────── */

/**
 * @desc    Permet à un candidat de postuler à une offre
 * @route   POST /api/applications/apply/:jobId
 * @body    { coverLetter? }
 * @access  Private (Candidat uniquement)
 */
export const applyJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body; // ⚡ CORRECTION : On récupère la lettre de motivation depuis le body !
    const candidateId = req.user.id;

    // 1. Role check (Attention à la casse, harmonise avec ton modèle BDD, ex: "CANDIDAT")
    if (req.user.role?.toUpperCase() !== "CANDIDAT") {
      return res.status(403).json({ error: "Seuls les candidats peuvent postuler." });
    }

    // 2. Fetch user (need CV + name + email for the confirmation email)
    const user = await prisma.user.findUnique({
      where:  { id: candidateId },
      select: { firstName: true, lastName: true, email: true, curriculum_vitae: true },
    });

    if (!user || !user.curriculum_vitae) {
      return res.status(400).json({
        error:   "Action requise",
        message: "Vous devez uploader un CV dans votre profil avant de pouvoir postuler.",
      });
    }

    // 3. Duplicate check
    const alreadyApplied = await prisma.application.findFirst({
      where: { jobId: parseInt(jobId), candidateId },
    });
    if (alreadyApplied) {
      return res.status(400).json({ error: "Vous avez déjà postulé à cette offre." });
    }

    // 4. Fetch job info (needed for the email)
    const job = await prisma.job.findUnique({
      where:  { id: parseInt(jobId) },
      select: { title: true, company: { select: { name: true } } },
    });
    if (!job) {
      return res.status(404).json({ error: "Offre introuvable." });
    }

    // 5. Create application
    const application = await prisma.application.create({
      data: {
        jobId:       parseInt(jobId),
        candidateId,
        cvUrl:       user.curriculum_vitae,
        coverLetter: coverLetter || null, // ⚡ Fonctionne correctement maintenant
        status:      "PENDING",
      },
    });

    // 6. Send confirmation email (non-blocking)
    try {
      await sendConfirmationEmail({
        to:          user.email,
        candidateName: `${user.firstName} ${user.lastName}`,
        jobTitle:    job.title,
        companyName: job.company?.name || "l'entreprise",
      });
    } catch (emailErr) {
      console.error("⚠️ Email confirmation failed (non-fatal):", emailErr.message);
    }

    return res.status(201).json({
      message:     "Candidature envoyée avec succès !",
      application,
    });

  } catch (error) {
    console.error("Apply Job Error:", error);
    res.status(500).json({ error: "Erreur serveur lors de l'observation ou de la postulation." });
  }
};