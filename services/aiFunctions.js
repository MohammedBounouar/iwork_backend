import { db } from "./db.js";

export const aiFunctions = {

  // ----------------------------
  // 👨‍💼 HRs under an admin
  // ----------------------------
  getHRCount: async ({ adminId }) => {
    const [rows] = await db.query(
      "SELECT COUNT(*) as total FROM User WHERE role='HR' AND adminId=?",
      [adminId]
    );
    return rows[0];
  },

  // ----------------------------
  // 💼 Jobs created by HRs under admin
  // ----------------------------
  getOffersCount: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Job j
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // 💼 Active (open) job offers
  // ----------------------------
  getActiveOffersCount: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Job j
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ? AND j.status = 'OPEN'
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // 📄 Applications for admin's jobs
  // ----------------------------
  getApplicationsCount: async ({ adminId, year }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
      AND YEAR(a.appliedAt) = ?
    `, [adminId, year]);
    return rows[0];
  },

  // ----------------------------
  // ⏳ Pending applications (not yet reviewed)
  // ----------------------------
  getPendingApplicationsCount: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ? AND a.status = 'PENDING'
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // ✅ Accepted applications
  // ----------------------------
  getAcceptedApplicationsCount: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ? AND a.status = 'ACCEPTED'
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // ❌ Rejected applications
  // ----------------------------
  getRejectedApplicationsCount: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ? AND a.status = 'REJECTED'
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // 👤 Candidates (global)
  // ----------------------------
  getCandidatesCount: async () => {
    const [rows] = await db.query(
      "SELECT COUNT(*) as total FROM User WHERE role='CANDIDAT'"
    );
    return rows[0];
  },

  // ----------------------------
  // 🏆 Most applied job offers
  // ----------------------------
  getTopJobs: async ({ adminId, limit = 5 }) => {
    const [rows] = await db.query(`
      SELECT j.title, COUNT(a.id) as applications
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
      GROUP BY j.id, j.title
      ORDER BY applications DESC
      LIMIT ?
    `, [adminId, limit]);
    return rows;
  },

  // ----------------------------
  // 📅 Applications this month
  // ----------------------------
  getApplicationsThisMonth: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
        AND MONTH(a.appliedAt) = MONTH(CURDATE())
        AND YEAR(a.appliedAt) = YEAR(CURDATE())
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // 📅 Applications this week
  // ----------------------------
  getApplicationsThisWeek: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT COUNT(*) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
        AND YEARWEEK(a.appliedAt, 1) = YEARWEEK(CURDATE(), 1)
    `, [adminId]);
    return rows[0];
  },

  // ----------------------------
  // 📊 Applications per job (breakdown)
  // ----------------------------
  getApplicationsPerJob: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT j.title, COUNT(a.id) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
      GROUP BY j.id, j.title
      ORDER BY total DESC
    `, [adminId]);
    return rows;
  },

  // ----------------------------
  // 📊 Applications per HR
  // ----------------------------
  getApplicationsPerHR: async ({ adminId }) => {
    const [rows] = await db.query(`
      SELECT u.name, COUNT(a.id) as total
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ? AND u.role = 'HR'
      GROUP BY u.id, u.name
      ORDER BY total DESC
    `, [adminId]);
    return rows;
  },

  // ----------------------------
  // 🕒 Latest applications
  // ----------------------------
  getRecentApplications: async ({ adminId, limit = 5 }) => {
    const [rows] = await db.query(`
      SELECT 
        CONCAT(c.firstName, ' ', c.lastName) as candidate,
        j.title as job,
        a.status,
        a.appliedAt
      FROM Application a
      JOIN Job j ON a.jobId = j.id
      JOIN User u ON j.authorId = u.id
      JOIN User c ON a.candidateId = c.id
      WHERE u.adminId = ?
      ORDER BY a.appliedAt DESC
      LIMIT ?
    `, [adminId, limit]);
    return rows;
  },

  // ----------------------------
  // 🆕 Latest job offers posted
  // ----------------------------
  getRecentJobs: async ({ adminId, limit = 5 }) => {
    const [rows] = await db.query(`
      SELECT j.title, u.name as postedBy, j.createdAt, j.status
      FROM Job j
      JOIN User u ON j.authorId = u.id
      WHERE u.adminId = ?
      ORDER BY j.createdAt DESC
      LIMIT ?
    `, [adminId, limit]);
    return rows;
  },

};