/**
 * Google Drive Interactive Setup Helper
 * 
 * Run with: node scripts/setup-drive.js
 * 
 * This script guides you through setting up Google Cloud credentials,
 * opens the authorization URL in your browser, obtains a long-lived Refresh Token,
 * automatically creates your root storage folder on Google Drive,
 * and updates your server/.env file automatically!
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');
const { google } = require('googleapis');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const REDIRECT_PORT = 5050;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function updateEnvFile(newValues) {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  for (const [key, val] of Object.entries(newValues)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
  console.log(' Successfully updated server/.env with your Google Drive credentials!');
}

async function main() {
  console.log('\n======================================================');
  console.log('   Google Drive Setup for Personal File Manager');
  console.log('======================================================\n');
  console.log('To connect your father\'s Google Drive:');
  console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
  console.log('2. Create or select a project (e.g. "Family File Manager").');
  console.log('3. Go to "APIs & Services" > "Library" > Search and enable "Google Drive API".');
  console.log('4. Go to "APIs & Services" > "OAuth consent screen":');
  console.log('   - User Type: External');
  console.log('   - App name: "Family Archive"');
  console.log('   - Add your Google account under "Test users".');
  console.log('5. Go to "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth client ID":');
  console.log('   - Application type: Web application');
  console.log('   - Name: "File Manager Web"');
  console.log(`   - Authorized redirect URIs: Add "${REDIRECT_URI}" and "https://developers.google.com/oauthplayground"`);
  console.log('   - Click Create, then copy your Client ID and Client Secret.\n');

  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || clientId.trim() === '') {
    clientId = await ask('Enter your GOOGLE_CLIENT_ID: ');
  } else {
    const change = await ask(`Use existing GOOGLE_CLIENT_ID (${clientId.substring(0, 15)}...)? [Y/n]: `);
    if (change.toLowerCase() === 'n') {
      clientId = await ask('Enter your GOOGLE_CLIENT_ID: ');
    }
  }

  if (!clientSecret || clientSecret.trim() === '') {
    clientSecret = await ask('Enter your GOOGLE_CLIENT_SECRET: ');
  } else {
    const change = await ask(`Use existing GOOGLE_CLIENT_SECRET (${clientSecret.substring(0, 8)}...)? [Y/n]: `);
    if (change.toLowerCase() === 'n') {
      clientSecret = await ask('Enter your GOOGLE_CLIENT_SECRET: ');
    }
  }

  clientId = clientId.trim();
  clientSecret = clientSecret.trim();

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });

  console.log('\n--- Authorize in Browser ---');
  console.log('Please open this URL in your browser to sign into Google and grant access:\n');
  console.log(authUrl);
  console.log('\nWaiting for callback on http://localhost:5050/oauth2callback ...\n');

  // Start temporary local HTTP server to receive the authorization code automatically
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/oauth2callback')) {
        const urlObj = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
        const code = urlObj.searchParams.get('code');

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h3>Error: No authorization code received.</h3>');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2 style="color: #2e7d32;">Authorization Successful!</h2>
            <p>You can close this browser tab and return to your terminal.</p>
          </div>
        `);

        server.close();

        console.log(' Authorization code received! Exchanging for Refresh Token...');
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const refreshToken = tokens.refresh_token;
        if (!refreshToken) {
          console.warn('  Warning: No new refresh token was returned by Google. Google only returns a refresh_token when prompt=consent or on the first authorization.');
        } else {
          console.log(' Got long-lived Refresh Token!');
        }

        // Initialize Google Drive client to create root folder
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        console.log(' Creating root folder "Family Archive" in Google Drive...');
        let rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

        if (!rootFolderId || rootFolderId.trim() === '') {
          const folderRes = await drive.files.create({
            resource: {
              name: 'Family Archive (File Manager)',
              mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id'
          });
          rootFolderId = folderRes.data.id;
          console.log(` Created dedicated root folder with ID: ${rootFolderId}`);
        } else {
          console.log(` Using existing root folder ID: ${rootFolderId}`);
        }

        // Update server/.env file
        updateEnvFile({
          GOOGLE_CLIENT_ID: clientId,
          GOOGLE_CLIENT_SECRET: clientSecret,
          ...(refreshToken ? { GOOGLE_REFRESH_TOKEN: refreshToken } : {}),
          GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId
        });

        console.log('\n Google Drive integration is completely configured and ready to use!');
        console.log('You can now restart your backend server:\n  npm run server:dev\n');
        rl.close();
        process.exit(0);
      }
    } catch (err) {
      console.error('Error during token exchange:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h3>Error: ${err.message}</h3>`);
      server.close();
      rl.close();
      process.exit(1);
    }
  });

  server.listen(REDIRECT_PORT);
}

main().catch((err) => {
  console.error('Setup failed:', err);
  rl.close();
  process.exit(1);
});
