import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCTqxG7glnnUtof4f4iWw4a5Sw2SLtBuYA',
  authDomain: 'sistema-voleibol.firebaseapp.com',
  projectId: 'sistema-voleibol',
  storageBucket: 'sistema-voleibol.firebasestorage.app',
  messagingSenderId: '183378810813',
  appId: '1:183378810813:web:9a505ad7bf2416ffb9a4d4',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
