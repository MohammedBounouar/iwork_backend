import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: "Token manquant" });
    }

    const token = authHeader.split(' ')[1];

    try {
        // CHANGE THIS LINE: Use process.env.JWT_SECRET instead of "SECRET_KEY"
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token invalide" });
    }
};