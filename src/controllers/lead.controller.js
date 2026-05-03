const leadModel = require('../models/lead.model');

async function getAllLeads(req, res) {
    try {
        const { companyId } = req.user;
        const leads = await leadModel.find({ companyId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: leads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function deleteLead(req, res) {
    try {
        const { leadId } = req.params;
        const { companyId } = req.user;
        await leadModel.findOneAndDelete({ _id: leadId, companyId });
        res.status(200).json({ success: true, message: "Lead deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { getAllLeads, deleteLead };
