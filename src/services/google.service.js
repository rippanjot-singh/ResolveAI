const { OAuth2Client } = require('google-auth-library');
const config = require('../config/config');

const client = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
);

const getGoogleAuthUrl = () => {
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
    });
};

const getGoogleUser = async (code) => {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: config.GOOGLE_CLIENT_ID,
    });

    return ticket.getPayload();
};

module.exports = {
    getGoogleAuthUrl,
    getGoogleUser
};
