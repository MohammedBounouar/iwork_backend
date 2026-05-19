import prisma from "../config/prisma.js";

/**
 * CHECK IF USER HAS COMPANY
 */
export const checkCompany = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      hasCompany: !!user.companyId,
      companyId: user.companyId,
      role: user.role,
    });
  } catch (err) {
    console.error("checkCompany error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * CREATE COMPANY (ADMIN ONLY - ONBOARDING)
 */
export const createCompany = async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      website,
      foundedYear,
      size,
      linkedin,
      twitter,
      github,
      tags,
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const adminId = req.user.id;

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can create a company" });
    }

    if (!name) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: adminId },
      select: { companyId: true },
    });

    if (existingUser?.companyId) {
      return res.status(400).json({ error: "You already have a company" });
    }

    const logoPath = req.file ? `/uploads/logos/${req.file.filename}` : null;

    // Parse tags from JSON string then join as comma-separated for MySQL
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = [];
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        description:  description || null,
        location:     location    || null,
        website:      website     || null,
        logo:         logoPath,
        foundedYear:  foundedYear ? parseInt(foundedYear) : null,
        size:         size        ? parseInt(size)        : null,
        linkedin:     linkedin    || null,
        twitter:      twitter     || null,
        github:       github      || null,
        tags:         Array.isArray(parsedTags) ? parsedTags.join(",") : null,
      },
    });

    // Attach company to admin user
    await prisma.user.update({
      where: { id: adminId },
      data: { companyId: company.id },
    });

    return res.status(201).json({
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.error("createCompany error:", error);
    return res.status(500).json({
      error: "Error creating company",
      details: error.message,
    });
  }
};
/**
 * SEARCH COMPANY BY NAME
 */
export const searchCompany = async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        error: "Company name is required",
      });
    }

    const company = await prisma.company.findFirst({
      where: {
        name: {
          contains: name,
          mode: "insensitive", // case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        website: true,
        logo: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        error: "Company not found",
      });
    }

    return res.status(200).json(company);
  } catch (error) {
    console.error("searchCompany error:", error);
    return res.status(500).json({
      error: "Error searching company",
    });
  }
};


export const getMyCompany = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { companyId: true },
  });

  if (!user?.companyId) {
    return res.status(404).json({ error: "No company" });
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
  });

  res.json(company);
};


/**
 * UPDATE COMPANY (ADMIN ONLY)
 */
export const updateCompany = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user's company and role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user || !user.companyId) {
      return res.status(400).json({ error: "No company found" });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admin can update company" });
    }

    const {
      name,
      description,
      location,
      website,
      foundedYear,
      size,
      linkedin,
      twitter,
      github,
      tags,
    } = req.body;

    // Use new logo if uploaded, otherwise keep existing
    const logoPath = req.file
      ? `/uploads/logos/${req.file.filename}`
      : undefined;

    // Parse tags from JSON string then join as comma-separated for MySQL
    let parsedTags;
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = undefined;
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: {
        name,
        description:  description || null,
        location:     location    || null,
        website:      website     || null,
        foundedYear:  foundedYear ? parseInt(foundedYear) : null,
        size:         size        ? parseInt(size)        : null,
        linkedin:     linkedin    || null,
        twitter:      twitter     || null,
        github:       github      || null,
        ...(parsedTags !== undefined && {
          tags: Array.isArray(parsedTags) ? parsedTags.join(",") : null,
        }),
        ...(logoPath !== undefined && { logo: logoPath }),
      },
    });

    return res.json({
      message: "Company updated successfully",
      company: updatedCompany,
    });
  } catch (err) {
    console.error("updateCompany error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};