import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Choix dynamique du dossier selon le champ du formulaire
        let dir = 'uploads/logos/';
        if (file.fieldname === 'document' || file.fieldname === 'cv') {
            dir = 'uploads/cv/';
        }
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Exemple de rendu : cv-1716300000-123456789.pdf
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Augmenté à 5Mo pour être à l'aise avec les gros fichiers Word/PDF
    fileFilter: (req, file, cb) => {
        // 1. Si c'est un logo, on valide que c'est bien une image
        if (file.fieldname === 'logo') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Seules les images sont autorisées pour le logo !'), false);
            }
        } 
        // 2. Si c'est un CV, on accepte uniquement les PDF et Word (.docx)
        else if (file.fieldname === 'document' || file.fieldname === 'cv') {
            const allowedDocTypes = [
                'application/pdf', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            
            if (allowedDocTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Seuls les fichiers PDF et DOCX sont autorisés pour le CV !'), false);
            }
        } 
        // Au cas où un autre champ inconnu est envoyé
        else {
            cb(new Error('Champ de fichier non reconnu.'), false);
        }
    }
});

export default upload;