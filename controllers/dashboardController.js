import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * DASHBOARD STATS (Company Scoped)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = user.companyId;

    if (!companyId && user.role !== "ADMIN") {
      return res.status(400).json({ message: "Company not found" });
    }

    const isAdmin = user.role === "ADMIN";
    const companyFilter = isAdmin ? {} : { companyId };

    // ================= PARALLEL QUERIES =================
    const [
      totalHR,
      totalOffers,
      activeOffers,
      totalApplications,
      applicationsByStatus,
      jobsByCategory,
      hrRaw,
      applicationsByMonthRaw,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "HR", ...companyFilter },
      }),

      prisma.job.count({
        where: companyFilter,
      }),

      prisma.job.count({
        where: { ...companyFilter, isActive: true },
      }),

      prisma.application.count({
        where: {
          job: { ...companyFilter },
        },
      }),

      prisma.application.groupBy({
        by: ["status"],
        where: {
          job: { ...companyFilter },
        },
        _count: { _all: true },
      }),

      prisma.job.groupBy({
        by: ["categoryId"],
        where: companyFilter,
        _count: { id: true },
      }),

      // 👇 HR DATA FOR PERFORMANCE
      prisma.user.findMany({
        where: {
          role: "HR",
          ...companyFilter,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobsCreated: {
            select: {
              id: true,
              applications: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      }),
        // ✅ MONTHLY DATA
            prisma.$queryRaw`
    SELECT 
        DATE_FORMAT(a.appliedAt, '%Y-%m') as month,
        COUNT(*) as total
    FROM Application a
    INNER JOIN Job j ON j.id = a.jobId
    WHERE j.companyId = ${companyId}
    GROUP BY DATE_FORMAT(a.appliedAt, '%Y-%m')
    ORDER BY month ASC;
    `,
    ]);
    const applicationsByMonth = applicationsByMonthRaw.map((row) => ({
        x: row.month,
        v: Number(row.total),
    }));

    // ================= HR PERFORMANCE =================
    const hrPerformance = hrRaw.map((hr) => {
      let offers = 0;
      let candidatures = 0;
      let hired = 0;

      hr.jobsCreated.forEach((job) => {
        offers += 1;
        candidatures += job.applications.length;
        hired += job.applications.filter(
          (app) => app.status === "accepted"
        ).length;
      });

      const score =
        offers * 1 +
        candidatures * 0.5 +
        hired * 3;

      return {
        hrId: hr.id,
        name: `${hr.firstName || ""} ${hr.lastName || ""}`.trim(),
        offers,
        candidatures,
        hired,
        score,
      };
    });

    // sort best HR first
    hrPerformance.sort((a, b) => b.score - a.score);

    // ================= RESPONSE =================
    return res.json({
      kpis: {
        totalHR,
        totalOffers,
        activeOffers,
        totalApplications,
      },
      charts: {
        applicationsByStatus,
        jobsByCategory,
        applicationsByMonth
      },
      hrPerformance,
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
  
};