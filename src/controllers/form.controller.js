const Form = require('../models/form.model');
const FormResult = require('../models/formResults.model');
const leadModel = require('../models/lead.model');
const { getIO } = require('../utils/socket');

async function submitPublicForm(req, res) {
    try {
        const { formId } = req.params;
        const data = req.body;

        if (!formId) {
            return res.status(400).json({ success: false, message: "Form ID is required" });
        }

        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found" });
        }

        if (!form.isActive) {
            return res.status(403).json({ success: false, message: "This form is no longer accepting responses" });
        }

        // Create the result
        const result = await FormResult.create({
            formId: form._id,
            userId: form.userId,
            data,
            metadata: {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                referrer: req.get('Referrer')
            }
        });
        const lead = await leadModel.findOneAndUpdate(
            { companyId: form.companyId, email: data.email },
            {
                $set: {
                    name: data.name,
                    note: `lead captured from form ${formId}. [RESULT: ${JSON.stringify(data)}]`
                }
            },
            { upsert: true, new: true }
        );

        // Background: Process submission with AI (don't await to avoid blocking response)
        const { processFormSubmission } = require('../utils/formAi.utils');
        processFormSubmission(form, result).catch(err => console.error("Form AI processing failed:", err));

        // Emit socket event
        try {
            const io = getIO();
            const room = form.companyId.toString();
            io.to(room).emit('new_submission', {
                ...result.toObject(),
                formId: { _id: form._id, name: form.name }
            });
            io.to(room).emit('new_lead', lead);
        } catch (err) {
            console.error("Socket emit error:", err);
        }

        // If it's a standard form submission (not AJAX), redirect back to the referrer
        const referrer = req.get('Referrer');
        if (referrer && !req.xhr && req.headers.accept?.includes('text/html')) {
            return res.redirect(referrer + '?success=true');
        }

        res.status(201).json({
            success: true,
            message: "Response submitted successfully",
            data: result,
            lead: lead
        });
    } catch (error) {
        console.error("Form Submission Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

// Admin/Owner controllers
async function getAllForms(req, res) {
    try {
        const { companyId } = req.user;
        const forms = await Form.find({ companyId }).sort({ createdAt: -1 });
        res.json({ success: true, data: forms });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function toggleFormStatus(req, res) {
    try {
        const { formId } = req.params;
        const form = await Form.findById(formId);
        if (!form) return res.status(404).json({ success: false, message: "Form not found" });
        
        // Ensure user belongs to the same company
        if (form.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        
        form.isActive = !form.isActive;
        await form.save();
        res.json({ success: true, data: form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function deleteForm(req, res) {
    try {
        const { formId } = req.params;
        const form = await Form.findById(formId);
        if (!form) return res.status(404).json({ success: false, message: "Form not found" });
        
        if (form.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        
        await Form.findByIdAndDelete(formId);
        // Also delete associated results
        await FormResult.deleteMany({ formId });
        
        res.json({ success: true, message: "Form deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getFormById(req, res) {
    try {
        const { formId } = req.params;
        const form = await Form.findById(formId);
        if (!form) return res.status(404).json({ success: false, message: "Form not found" });
        
        if (form.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        
        res.json({ success: true, data: form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function updateForm(req, res) {
    try {
        const { formId } = req.params;
        const { name, description, fields } = req.body;
        
        const form = await Form.findById(formId);
        if (!form) return res.status(404).json({ success: false, message: "Form not found" });
        
        if (form.companyId.toString() !== req.user.companyId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        
        form.name = name || form.name;
        form.description = description !== undefined ? description : form.description;
        form.fields = fields || form.fields;
        
        await form.save();
        res.json({ success: true, message: "Form updated successfully", data: form });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getFormResults(req, res) {
    try {
        const { formId } = req.params;
        const results = await FormResult.find({ formId }).populate('formId', 'name').sort({ createdAt: -1 });
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getAllFormResults(req, res) {
    try {
        const { companyId } = req.user;
        const forms = await Form.find({ companyId });
        const formIds = forms.map(f => f._id);
        const results = await FormResult.find({ formId: { $in: formIds } }).populate('formId', 'name').sort({ createdAt: -1 });
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function createForm(req, res) {
    try {
        const { name, description, fields, userId } = req.body;

        if (!name || !fields || !Array.isArray(fields)) {
            return res.status(400).json({ success: false, message: "Name and fields array are required" });
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required to create a form" });
        }

        const { companyId } = req.user;
        const form = await Form.create({
            companyId,
            userId,
            name,
            description,
            fields
        });

        res.status(201).json({
            success: true,
            message: "Form created successfully",
            data: form
        });
    } catch (error) {
        console.error("Create Form Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    submitPublicForm,
    getFormResults,
    getAllFormResults,
    createForm,
    getAllForms,
    toggleFormStatus,
    deleteForm,
    getFormById,
    updateForm
};
