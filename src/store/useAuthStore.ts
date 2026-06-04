import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../services/firebase';

// ─── Auth Store ───────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  authLoading: boolean;   // resolving initial auth state from Firebase
  isSubmitting: boolean;  // login / register in progress

  initAuth: () => () => void; // returns unsubscribe fn
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authLoading: true,
  isSubmitting: false,

  // Call once at app root; returns the Firebase unsubscribe function
  initAuth: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, authLoading: false });
    });
    return unsub;
  },

  login: async (email, password) => {
    set({ isSubmitting: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // user state is updated automatically via onAuthStateChanged
    } finally {
      set({ isSubmitting: false });
    }
  },

  register: async (email, password) => {
    set({ isSubmitting: true });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } finally {
      set({ isSubmitting: false });
    }
  },

  logout: async () => {
    await signOut(auth);
    // onAuthStateChanged sets user → null automatically
  },
}));
