const userModel = require("../models/user.model");
const { mistralSmall } = require("./ai.service");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");

/**
 * AI-driven ticket assignment logic.
 * Analyzes ticket content and team specialities to choose the best assignee.
 */
async function autoAssignTicket(ticketData, companyId) {
    try {
        // 1. Fetch available users for this company
        const team = await userModel.find({ 
            companyId, 
            isSolviingTickets: true 
        }).select("name role speciality");

        if (!team || team.length === 0) {
            return null; // Fallback to manual or unassigned
        }

        // 2. Get current workload for each team member
        const ticketModel = require("../models/ticket.model");
        const teamWithWorkload = await Promise.all(team.map(async (user) => {
            const openTickets = await ticketModel.countDocuments({ 
                assignedTo: user._id, 
                status: { $ne: 'closed' } 
            });
            return {
                id: user._id.toString(),
                name: user.name,
                role: user.role,
                speciality: user.speciality || 'General Support',
                workload: openTickets
            };
        }));

        // 3. Prepare AI Prompt
        const systemPrompt = `You are a workload management AI. Your task is to assign a new support ticket to the most relevant team member based on their speciality and current workload.
Rules:
1. Prioritize speciality relevance to the ticket content.
2. If multiple people have relevant specialities, choose the one with the lowest workload (equal work division).
3. If no one has a specific relevance, choose the one with the lowest workload.
4. Output ONLY the raw User ID of the chosen person. No explanation.`;

        const humanPrompt = `Ticket Content:
Subject/Inquiry: ${ticketData.inquiree || ticketData.name}
Priority: ${ticketData.priority || 'medium'}

Available Team Members:
${JSON.stringify(teamWithWorkload, null, 2)}

Choose the best User ID:`;

        // 4. Call AI
        const response = await mistralSmall.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(humanPrompt)
        ]);

        const assignedUserId = response.content.trim();

        // 5. Verify the ID belongs to our team (Security/Sanity check)
        const chosenUser = teamWithWorkload.find(u => u.id === assignedUserId);
        
        return chosenUser ? chosenUser.id : teamWithWorkload.sort((a, b) => a.workload - b.workload)[0].id;

    } catch (error) {
        console.error("Auto-assignment error:", error);
        return null;
    }
}

module.exports = { autoAssignTicket };
