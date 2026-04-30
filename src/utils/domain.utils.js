function isDomainVerified(req, chatbot) {
    const currentUrl = req.query.currentUrl;
    if (!currentUrl) return true; 

    try {
        const url = new URL(currentUrl);
        const host = url.hostname;

        // Bypass for local development
        if (host === 'localhost' || host === '127.0.0.1') return true;

        // Check restricted domains first
        if (chatbot.restrictedDomains && chatbot.restrictedDomains.includes(host)) {
            return false;
        }

        // If verifiedDomains is empty, allow all (except restricted)
        if (!chatbot.verifiedDomains || chatbot.verifiedDomains.length === 0) {
            return true;
        }

        // Check if host is in verified domains
        return chatbot.verifiedDomains.includes(host);
    } catch (e) {
        return false;
    }
}

module.exports = { isDomainVerified };
