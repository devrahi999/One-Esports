import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';

async function testAuth() {
  const auth = new GoogleAuth({
    keyFile: './one-esports-d3626-firebase-adminsdk-fbsvc-7f9b44a541.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log("SUCCESS MINTING TOKEN:", token ? !!token.token : false);
    
    // Now try fetching Firestore REST API directly
    const res = await client.request({
      url: 'https://firestore.googleapis.com/v1/projects/one-esports-d3626/databases/(default)/documents/tournaments'
    });
    console.log("REST API RESPONSE:", res.status);
  } catch (e: any) {
    console.error("AUTH ERROR:", e.message);
  }
}
testAuth();
