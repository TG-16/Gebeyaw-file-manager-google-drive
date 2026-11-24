const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null; // Will trigger fallback storage mode
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  driveClient = google.drive({
    version: 'v3',
    auth: oauth2Client
  });

  return driveClient;
}

module.exports = {
  getDriveClient
};
