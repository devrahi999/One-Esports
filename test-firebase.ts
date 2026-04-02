import * as admin from 'firebase-admin';
import * as fs from 'fs';

async function test() {
  try {
    const raw = fs.readFileSync('./one-esports-d3626-firebase-adminsdk-fbsvc-7f9b44a541.json', 'utf8');
    const config = JSON.parse(raw);
    
    admin.initializeApp({
      credential: admin.credential.cert(config)
    });
    
    console.log("Initialized config for:", config.client_email);
    
    const db = admin.firestore();
    const snap = await db.collection('tournaments').get();
    console.log("Success! Tournaments count:", snap.size);
  } catch(e) {
    console.error("FAILED:", e);
  }
}

test();
