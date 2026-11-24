const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { getDriveClient } = require('../config/drive');
const { pool } = require('../config/db');

// Local fallback storage folder if Google Drive is not yet configured
const LOCAL_STORAGE_DIR = path.join(__dirname, '../../uploads');

function ensureLocalDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Ensure a dedicated Google Drive folder exists for the user.
 * If user does not have drive_folder_id in DB, create one under root folder.
 */
async function ensureUserFolder(user) {
  const drive = getDriveClient();

  // If Google Drive credentials are not set, use local directory fallback
  if (!drive) {
    const userLocalDir = path.join(LOCAL_STORAGE_DIR, `user_${user.id}`);
    ensureLocalDir(userLocalDir);
    return `local_folder_user_${user.id}`;
  }

  if (user.drive_folder_id) {
    return user.drive_folder_id;
  }

  try {
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    const fileMetadata = {
      name: `user_${user.id}_${user.email}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: rootFolderId ? [rootFolderId] : []
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });

    const folderId = response.data.id;
    await pool.query('UPDATE users SET drive_folder_id = ? WHERE id = ?', [folderId, user.id]);
    return folderId;
  } catch (error) {
    console.error(' Error creating user folder in Google Drive:', error);
    throw error;
  }
}

/**
 * Upload a media file to Google Drive (or local storage fallback)
 */
async function uploadMediaFile({ fileBuffer, originalName, mimeType, user }) {
  const drive = getDriveClient();
  const folderId = await ensureUserFolder(user);

  // Local storage fallback
  if (!drive) {
    const userLocalDir = path.join(LOCAL_STORAGE_DIR, `user_${user.id}`);
    ensureLocalDir(userLocalDir);
    const uniqueFileId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(userLocalDir, uniqueFileId);
    fs.writeFileSync(filePath, fileBuffer);

    return {
      driveFileId: uniqueFileId,
      thumbnailLink: null,
      size: fileBuffer.length
    };
  }

  // Google Drive upload
  try {
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    const fileMetadata = {
      name: originalName,
      parents: [folderId]
    };

    const media = {
      mimeType,
      body: bufferStream
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, name, mimeType, size, thumbnailLink'
    });

    return {
      driveFileId: response.data.id,
      thumbnailLink: response.data.thumbnailLink || null,
      size: response.data.size || fileBuffer.length
    };
  } catch (error) {
    console.error(' Error uploading file to Google Drive:', error);
    throw error;
  }
}

/**
 * Stream/Download a media file
 */
async function getMediaStream(driveFileId, userId) {
  const drive = getDriveClient();

  if (!drive || driveFileId.startsWith('local_')) {
    const userLocalDir = path.join(LOCAL_STORAGE_DIR, `user_${userId}`);
    const filePath = path.join(userLocalDir, driveFileId);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in local storage');
    }
    return {
      stream: fs.createReadStream(filePath),
      size: fs.statSync(filePath).size
    };
  }

  try {
    const response = await drive.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return {
      stream: response.data
    };
  } catch (error) {
    console.error(' Error retrieving file from Google Drive:', error);
    throw error;
  }
}

/**
 * Delete a media file from Google Drive (or local storage fallback)
 */
async function deleteMediaFile(driveFileId, userId) {
  const drive = getDriveClient();

  if (!drive || driveFileId.startsWith('local_')) {
    const userLocalDir = path.join(LOCAL_STORAGE_DIR, `user_${userId}`);
    const filePath = path.join(userLocalDir, driveFileId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  }

  try {
    await drive.files.delete({ fileId: driveFileId });
    return true;
  } catch (error) {
    console.error(' Error deleting file from Google Drive:', error);
    return false;
  }
}

module.exports = {
  ensureUserFolder,
  uploadMediaFile,
  getMediaStream,
  deleteMediaFile
};
