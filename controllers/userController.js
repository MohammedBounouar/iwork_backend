const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const fs     = require('fs');

// Get current user profile
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true
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

// Récupérer un utilisateur spécifique par son ID
exports.getUserById = async (req, res) => {
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
exports.register = async (req, res) => {
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

//create The Rh by admin
exports.createRH = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const adminId = req.user.id;

        const adminData = await prisma.user.findUnique({ where: { id: adminId } });

        // Safety: Check if Admin has a company first
        if (!adminData.companyId) {
            return res.status(400).json({ error: "Vous devez créer une entreprise avant d'ajouter des RH" });
        }

        const newRH = await prisma.user.create({
            data: {
                email,
                password: await bcrypt.hash(password, 10),
                firstName,
                lastName,
                role: 'HR',
                companyId: adminData.companyId,
                adminId: adminId // This fills the 'admin' relation in your schema
            }
        });
        
        res.status(201).json(newRH);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la création du compte RH" });
    }
};


//login
exports.login = async (req, res) => {
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
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ 
            token, 
            role: user.role 
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
exports.createHR = async (req, res) => {
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

exports.uploadProfileCV = async (req, res) => {
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