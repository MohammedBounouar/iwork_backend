import { askGemini } from "./geminiService.js";
import { aiFunctions } from "../../services/aiFunctions.js";

export const chatAssistant = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const adminId = req.user?.adminId ?? req.user?.id;
    const text = message.toLowerCase();

    let result;
    let type = "ai";

    // HR
    if (text.includes("hr") || text.includes("rh") || text.includes("human resources")) {
      const data = await aiFunctions.getHRCount({ adminId });
      result = `You have ${data.total} HR manager(s).`;
      type = "db";
    }

    // Top jobs (specific FIRST)
    else if (text.includes("top job") || text.includes("most applied")) {
      const data = await aiFunctions.getTopJobs({ adminId });
      result = data.map((r, i) => `${i + 1}. ${r.title} — ${r.applications} applications`).join("\n");
      type = "db";
    }

    // Recent
    else if (text.includes("recent application") || text.includes("latest application")) {
      const data = await aiFunctions.getRecentApplications({ adminId });
      result = data.map(r => `• ${r.candidate} → ${r.job} (${r.status})`).join("\n");
      type = "db";
    }
    else if (text.includes("recent job") || text.includes("latest job")) {
      const data = await aiFunctions.getRecentJobs({ adminId });
      result = data.map(r => `• ${r.title} by ${r.postedBy} (${r.status})`).join("\n");
      type = "db";
    }

    // Offers
    else if (text.includes("active offer") || text.includes("open offer")) {
      const data = await aiFunctions.getActiveOffersCount({ adminId });
      result = `There are ${data.total} active job offers.`;
      type = "db";
    }
    else if (text.includes("offer") || text.includes("job")) {
      const data = await aiFunctions.getOffersCount({ adminId });
      result = `There are ${data.total} job offers total.`;
      type = "db";
    }

    // Applications
    else if (text.includes("pending")) {
      const data = await aiFunctions.getPendingApplicationsCount({ adminId });
      result = `There are ${data.total} pending applications.`;
      type = "db";
    }
    else if (text.includes("accepted")) {
      const data = await aiFunctions.getAcceptedApplicationsCount({ adminId });
      result = `${data.total} applications have been accepted.`;
      type = "db";
    }
    else if (text.includes("rejected")) {
      const data = await aiFunctions.getRejectedApplicationsCount({ adminId });
      result = `${data.total} applications have been rejected.`;
      type = "db";
    }
    else if (text.includes("this week")) {
      const data = await aiFunctions.getApplicationsThisWeek({ adminId });
      result = `There are ${data.total} applications this week.`;
      type = "db";
    }
    else if (text.includes("application") && text.includes("on")) {
      const jobTitle = message.split("on")[1]?.trim();

      const data = await aiFunctions.getApplicationsPerJob({
        adminId,
        jobTitle,
      });

      if (!data.length) {
        result = `No applications found for "${jobTitle}".`;
      } else {
        result = data
          .map(r => `• ${r.candidate} → ${r.job} (${r.status})`)
          .join("\n");
      }

      type = "db";
    }

    // Candidates
    else if (text.includes("candidate")) {
      const data = await aiFunctions.getCandidatesCount({ adminId });
      result = `There are ${data.total} candidates registered.`;
      type = "db";
    }

    // AI fallback
    else {
      const responses = [
        "I don’t have this information.",
        "I’m not able to answer that request.",
        "This data is not available in your dashboard.",
        "Sorry, I can’t find this information."
      ];

      result = responses[Math.floor(Math.random() * responses.length)];
      type = "fallback";
    }

    return res.json({ type, reply: result });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI failed" });
  }
};