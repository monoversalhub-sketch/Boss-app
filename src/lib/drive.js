import { Readable } from "stream";
import { OAuth2Client } from "google-auth-library";
import { drive as driveV3 } from "@googleapis/drive";

const FOLDER_NAME = "BOSS Backups";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
}

export function getDriveAuthUrl(userId) {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: Buffer.from(userId).toString("base64"),
  });
}

export async function exchangeCodeForTokens(code) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function getDriveClient(refreshToken) {
  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return driveV3({ version: "v3", auth });
}

async function getOrCreateFolder(drive) {
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  if (res.data.files?.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folder.data.id;
}

export async function uploadBackup(refreshToken, backupData) {
  const drive = await getDriveClient(refreshToken);
  const folderId = await getOrCreateFolder(drive);
  const fileName = `boss-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const content = JSON.stringify(backupData, null, 2);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "application/json",
      body: Readable.from(Buffer.from(content, "utf-8")),
    },
    fields: "id,name,createdTime",
  });

  return res.data;
}

export async function listBackups(refreshToken) {
  const drive = await getDriveClient(refreshToken);
  const folderId = await getOrCreateFolder(drive);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'boss-backup' and trashed=false`,
    fields: "files(id,name,createdTime,size)",
    orderBy: "createdTime desc",
    pageSize: 20,
    spaces: "drive",
  });

  return res.data.files || [];
}

export async function downloadBackup(refreshToken, fileId) {
  const drive = await getDriveClient(refreshToken);

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );

  return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
}
