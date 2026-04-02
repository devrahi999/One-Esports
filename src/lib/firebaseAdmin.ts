import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

function getFirebaseAdmin() {
  // Force clear cached apps in Next.js dev to allow picking up the JSON
  if (admin.apps.length > 0) {
    for (const app of admin.apps) {
      if (app) app.delete(); // Delete the old app
    }
  }

  try {
    let credentialConfig: any = null;

    // Option 1: Load from service account JSON file path (local dev)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const raw = fs.readFileSync(filePath, 'utf-8');
      credentialConfig = JSON.parse(raw);
    }
    // Option 2: Load from base64 env var (production/hosting)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const raw = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        'base64'
      ).toString('utf-8');
      credentialConfig = JSON.parse(raw);
    }

    if (credentialConfig) {
      console.log('FirebaseAdmin: Initializing with cert for email:', credentialConfig.client_email);
      admin.initializeApp({
        credential: admin.credential.cert(credentialConfig),
        projectId: credentialConfig.project_id
      });
    } else {
      console.log('FirebaseAdmin: Initializing with ADC (Fallback)');
      admin.initializeApp();
    }
  } catch (e: any) {
    console.error('FirebaseAdmin init failing:', e);
    if (!admin.apps.length) throw e;
  }

  return admin;
}

export const getDb = () => getFirebaseAdmin().firestore();
export default getFirebaseAdmin;
