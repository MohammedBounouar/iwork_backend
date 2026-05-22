import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt    from 'jsonwebtoken';
import fs     from 'fs';

// Get current user profile
export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                curriculum_vitae: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors de la récupération du profil" });
    }
};

/**
 * @desc    Mettre à jour les informations textuelles du profil utilisateur
 * @route   PUT /api/users/update-profile
 * @access  Private
 */
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;

    // 1. Validation de base
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    // 2. Vérification si l'email est déjà pris par un autre utilisateur
    const emailExists = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId }
      }
    });

    if (emailExists) {
      return res.status(400).json({ error: "Cette adresse e-mail est déjà utilisée." });
    }

    // 3. Mise à jour de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        curriculum_vitae: true // Inclus pour conserver l'état du CV côté Front
      }
    });

    return res.status(200).json({
      message: "Profil mis à jour avec succès !",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la mise à jour du profil." });
  }
};

// Récupérer un utilisateur spécifique par son ID
export const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                offres: true,
                candidatures: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la recherche" });
    }
};


// Créer un utilisateur:
export const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        // 1. Basic Validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email et mot de passe requis" });
        }

        // 2. Check if email exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "Email déjà utilisé" });

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Force specific logic based on role
        // If someone tries to register as 'RH' manually, block it or force it to 'CANDIDATE'
        let assignedRole = role; 
        if (role === 'RH') {
            return res.status(403).json({ error: "Les comptes RH doivent être créés par un Admin" });
        }
        
        // Default to CANDIDATE if no role is provided
        if (!assignedRole) assignedRole = 'CANDIDATE';

        // 5. Create the user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: assignedRole,
            },
            select: { id: true, email: true, role: true }
        });

        // 6. Response
        // If Admin, the frontend should now redirect them to "/complete-company-profile"
        res.status(201).json({
            message: "Utilisateur créé avec succès",
            user,
            redirectTo: assignedRole === 'ADMIN' ? '/create-company' : '/dashboard'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};


//login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email et mot de passe requis" });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role , companyId: user.companyId },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ 
            token, 
            role: user.role,
            companyId: user.companyId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

/**
 * @desc    Permet à un ADMIN d'ajouter un membre RH à son entreprise
 * @route   POST /api/admin/create-hr
 * @access  Private (ADMIN uniquement)
 */
export const createHR = async (req, res) => {
    try {
        const { email, password, firstName, lastName, assignedCategoryId } = req.body;
        const admin = req.user; // Récupéré via le middleware d'authentification

        // 1. Vérification de sécurité : Seul un ADMIN peut créer un HR
        if (admin.role !== 'ADMIN') {
            return res.status(403).json({ error: "Accès refusé. Seul l'administrateur peut créer des comptes RH." });
        }

        // 2. Vérifier si l'utilisateur existe déjà
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà." });
        }

        // 3. Hachage du mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Création du compte HR
        // On lie l'HR à la même entreprise que l'Admin (admin.companyId)
        // On lui assigne sa catégorie de département
        const newHR = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role: 'HR',
                companyId: admin.companyId, // Liaison automatique à l'entreprise
                adminId: admin.id,        // Liaison hiérarchique à l'admin
                assignedCategoryId: parseInt(assignedCategoryId), // Département spécifique
            },
            include: {
                assignedCategory: true,
                company: true
            }
        });

        // 5. Réponse (sans le mot de passe)
        const { password: _, ...hrData } = newHR;
        res.status(201).json({
            message: "Compte RH créé avec succès et assigné au département.",
            user: hrData
        });

    } catch (error) {
        console.error("Create HR Error:", error);
        res.status(500).json({ error: "Erreur lors de la création du compte RH." });
    }
};
export const updateHR = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, password, assignedCategoryId } = req.body;
        const requester = req.user;

        const targetId = parseInt(id);
        if (isNaN(targetId)) return res.status(400).json({ error: "ID invalide." });

        // 1. Fetch current data to compare
        const targetHR = await prisma.user.findUnique({ where: { id: targetId } });
        if (!targetHR) return res.status(404).json({ error: "RH non trouvé." });

        const updateData = {};

        // 2. Only add to updateData if the value is provided and NOT an empty string
        if (firstName && firstName.trim() !== "") {
            updateData.firstName = firstName;
        }
        
        if (lastName && lastName.trim() !== "") {
            updateData.lastName = lastName;
        }

        // 3. Conditional Email Logic
        if (email && email.trim() !== "" && email !== targetHR.email) {
            const exists = await prisma.user.findFirst({
                where: { email, NOT: { id: targetId } }
            });
            if (exists) return res.status(400).json({ error: "Email déjà utilisé." });
            updateData.email = email;
        }

        // 4. Conditional Password Logic (Only hash if a new one is typed)
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // 5. Category Logic (Only if requester is ADMIN)
        if (assignedCategoryId && requester.role === 'ADMIN') {
            updateData.assignedCategoryId = parseInt(assignedCategoryId);
        }

        // 6. Final Check: Did we actually change anything?
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "Aucune modification détectée." });
        }

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: updateData
        });

        res.status(200).json({ message: "Mise à jour réussie", user: updated });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur lors de la mise à jour." });
    }
};

/**
 * @desc    Récupère tous les membres RH de l'entreprise de l'Admin connecté
 * @route   GET /api/admin/my-hr
 * @access  Private (ADMIN uniquement)
 */
export const getAllHRByAdmin = async (req, res) => {
    try {
        const admin = req.user; // Récupéré via le middleware d'authentification

        // 1. Vérification de sécurité
        if (admin.role !== 'ADMIN') {
            return res.status(403).json({ 
                error: "Accès refusé. Seul l'administrateur peut voir la liste des RH." 
            });
        }

        // 2. Récupérer tous les utilisateurs ayant le rôle 'HR' dans la même entreprise
        const hrMembers = await prisma.user.findMany({
            where: {
                role: 'HR',
                companyId: admin.companyId
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                companyId: true,
                assignedCategoryId: true,
                createdAt: true,
                // On inclut les relations pour avoir le nom du département et de l'entreprise
                assignedCategory: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                company: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc' // Les plus récents en premier
            }
        });

        // 3. Réponse
        res.status(200).json({
            count: hrMembers.length,
            hrMembers
        });

    } catch (error) {
        console.error("Get All HR Error:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des comptes RH." });
    }
};




/**
 * @desc    Supprime un compte RH
 * @route   DELETE /api/users/delete-hr/:id
 * @access  Private (ADMIN uniquement)
 */
export const deleteHR = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = req.user; // From auth middleware

        // 1. Security Check: Only ADMINs can delete
        if (admin.role !== 'ADMIN') {
            return res.status(403).json({ error: "Accès refusé. Seul l'administrateur peut supprimer un RH." });
        }

        // 2. Find the target HR
        const targetHR = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!targetHR || targetHR.role !== 'HR') {
            return res.status(404).json({ error: "Compte RH introuvable." });
        }

        // 3. Ensure the HR belongs to the Admin's company
        if (targetHR.companyId !== admin.companyId) {
            return res.status(403).json({ error: "Accès refusé. Vous ne pouvez pas supprimer un membre d'une autre entreprise." });
        }

        // 4. Delete the HR
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ message: "Compte RH supprimé avec succès." });

    } catch (error) {
        console.error("Delete HR Error:", error);
        res.status(500).json({ error: "Erreur lors de la suppression du compte RH." });
    }
};



export const uploadProfileCV = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        // OPTIONNEL : Supprimer l'ancien fichier s'il existe
        if (user.curriculum_vitae && fs.existsSync(user.curriculum_vitae)) {
            fs.unlinkSync(user.curriculum_vitae); 
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { curriculum_vitae: req.file.path }
        });

        res.status(200).json({ message: "CV mis à jour", cv: updatedUser.curriculum_vitae });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'upload" });
    }
};

export const deleteProfileCV = async (req, res) => {
    try {
        // 1. Récupérer l'utilisateur
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // 2. Supprimer le fichier physique du serveur s'il existe
        if (user.curriculum_vitae && fs.existsSync(user.curriculum_vitae)) {
            try {
                fs.unlinkSync(user.curriculum_vitae);
            } catch (fsErr) {
                console.error("Erreur lors de la suppression physique du fichier :", fsErr);
            }
        }

        // 3. Mettre à jour la base de données en remettant le champ à null
        await prisma.user.update({
            where: { id: req.user.id },
            data: { curriculum_vitae: null }
        });

        return res.status(200).json({ message: "CV supprimé avec succès" });

    } catch (error) {
        console.error("Erreur deleteProfileCV:", error);
        return res.status(500).json({ message: "Une erreur est survenue lors de la suppression." });
    }
};