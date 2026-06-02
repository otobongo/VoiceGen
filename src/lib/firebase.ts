// Firebase client setup. The web config below is PUBLIC by design (it is not a
// secret; access is governed by Firebase Security Rules). It's reused from the
// other build's committed config (project gen-lang-client-0909759915). To point
// at your own project, replace these values.
//
// NOTE: real Google sign-in requires this project's Authorized Domains to
// include the host you run on (localhost is allowed by default; add your Vercel
// domain before deploying). See AUTH_SETUP.md.

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'gen-lang-client-0909759915',
  appId: '1:943571405344:web:2a87d67e59f903352e4a45',
  apiKey: 'AIzaSyC7Ve-Ow_EvqXiJiLzP89Gr0UoU_IsIcGI',
  authDomain: 'gen-lang-client-0909759915.firebaseapp.com',
  storageBucket: 'gen-lang-client-0909759915.firebasestorage.app',
  messagingSenderId: '943571405344',
};

const firestoreDatabaseId = 'ai-studio-d4aea3b6-90a4-42e0-aca4-040827199805';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firestoreDatabaseId);
