import { create } from 'zustand';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  checkSession: () => Promise<UserProfile | null>;
  setProfileCompleted: (fullName: string, role: UserRole) => Promise<void>;
  addAgent: (email: string, password: string) => Promise<void>;
}

const DEMO_PROFILES: Record<string, Omit<UserProfile, 'email'>> = {
  'admin@demo.com': {
    id: 'demo_admin_uid',
    fullName: 'Administrateur Flotte',
    role: 'admin',
    ownerId: 'demo_admin_uid',
    isCompleted: true,
    permissions: {
      can_refill: true,
      can_add_vehicle: true,
      can_add_driver: true,
      can_view_reports: true,
      can_manage_users: true,
    }
  },
  'admin12@gmail.com': {
    id: 'demo_admin_uid',
    fullName: 'Administrateur Principal',
    role: 'admin',
    ownerId: 'demo_admin_uid',
    isCompleted: true,
    permissions: {
      can_refill: true,
      can_add_vehicle: true,
      can_add_driver: true,
      can_view_reports: true,
      can_manage_users: true,
    }
  },
  'responsable@demo.com': {
    id: 'demo_responsable_uid',
    fullName: 'Responsable Flotte',
    role: 'responsable',
    ownerId: 'demo_admin_uid',
    isCompleted: true,
    permissions: {
      can_refill: false,
      can_add_vehicle: false,
      can_add_driver: false,
      can_view_reports: true,
      can_manage_users: true,
    }
  },
  'agent@demo.com': {
    id: 'demo_agent_uid',
    fullName: 'Agent de Carburant',
    role: 'agent',
    ownerId: 'demo_admin_uid',
    isCompleted: true,
    permissions: {
      can_refill: true,
      can_add_vehicle: false,
      can_add_driver: false,
      can_view_reports: true,
      can_manage_users: false,
    }
  },
  'user12@gmail.com': {
    id: 'demo_agent_uid',
    fullName: 'Utilisateur / Agent',
    role: 'agent',
    ownerId: 'demo_admin_uid',
    isCompleted: true,
    permissions: {
      can_refill: true,
      can_add_vehicle: false,
      can_add_driver: false,
      can_view_reports: true,
      can_manage_users: false,
    }
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    const lowerEmail = email.trim().toLowerCase();

    // Demo Mode Auth
    if (lowerEmail.startsWith('demo_') || lowerEmail in DEMO_PROFILES) {
      const demoProfile = DEMO_PROFILES[lowerEmail] || {
        id: `demo_${lowerEmail.split('@')[0]}_uid`,
        fullName: 'Demo User',
        role: 'agent' as UserRole,
        ownerId: 'demo_admin_uid',
        isCompleted: true,
        permissions: {
          can_refill: true,
          can_add_vehicle: false,
          can_add_driver: false,
          can_view_reports: false,
          can_manage_users: false,
        }
      };

      const user: UserProfile = {
        ...demoProfile,
        email: lowerEmail,
      };

      localStorage.setItem('fuelleflow_user', JSON.stringify(user));
      set({ user, loading: false });
      return user;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur de connexion');

      const { data: profileDoc, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      let userProfile: UserProfile;

      if (profileError) {
        throw new Error(`Erreur lors de la récupération du profil: ${profileError.message}`);
      }

      if (!profileDoc) {
        // Nouveau profil à compléter
        userProfile = {
          id: authData.user.id,
          email: authData.user.email || email,
          fullName: 'Nouveau Membre',
          role: 'admin',
          ownerId: authData.user.id,
          isCompleted: false,
          permissions: {
            can_refill: true,
            can_add_vehicle: true,
            can_add_driver: true,
            can_view_reports: true,
            can_manage_users: true,
          }
        };
      } else {
        // Maper les permissions du JSON
        const parsedPermissions = {
          can_refill: profileDoc.role === 'agent' || profileDoc.role === 'admin',
          can_add_vehicle: profileDoc.role === 'admin',
          can_add_driver: profileDoc.role === 'admin',
          can_view_reports: profileDoc.role === 'responsable' || profileDoc.role === 'admin',
          can_manage_users: profileDoc.role === 'responsable' || profileDoc.role === 'admin',
        };

        if (profileDoc.permissions && typeof profileDoc.permissions === 'object') {
          Object.assign(parsedPermissions, profileDoc.permissions);
        }

        userProfile = {
          id: profileDoc.id,
          email: profileDoc.email || authData.user.email || '',
          fullName: profileDoc.full_name || '',
          role: profileDoc.role as UserRole,
          ownerId: profileDoc.owner_id || profileDoc.id,
          isCompleted: profileDoc.is_completed ?? true,
          permissions: parsedPermissions,
        };
      }

      localStorage.setItem('fuelleflow_user', JSON.stringify(userProfile));
      set({ user: userProfile, loading: false });
      return userProfile;
    } catch (err: any) {
      const errMsg = err.message || 'Erreur inconnue';
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ loading: true });
    // Check if demo user
    const isDemo = get().user?.email.startsWith('demo_') || get().user?.email.includes('demo.com');
    
    if (!isDemo) {
      await supabase.auth.signOut();
    }
    
    localStorage.removeItem('fuelleflow_user');
    set({ user: null, loading: false, error: null });
  },

  checkSession: async () => {
    set({ loading: true });
    const localUser = localStorage.getItem('fuelleflow_user');
    if (localUser) {
      try {
        const user = JSON.parse(localUser) as UserProfile;
        set({ user, loading: false });
        return user;
      } catch (_) {
        localStorage.removeItem('fuelleflow_user');
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileDoc } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileDoc) {
          const parsedPermissions = {
            can_refill: profileDoc.role === 'agent' || profileDoc.role === 'admin',
            can_add_vehicle: profileDoc.role === 'admin',
            can_add_driver: profileDoc.role === 'admin',
            can_view_reports: profileDoc.role === 'responsable' || profileDoc.role === 'admin',
            can_manage_users: profileDoc.role === 'responsable' || profileDoc.role === 'admin',
          };

          if (profileDoc.permissions && typeof profileDoc.permissions === 'object') {
            Object.assign(parsedPermissions, profileDoc.permissions);
          }

          const userProfile: UserProfile = {
            id: profileDoc.id,
            email: profileDoc.email || session.user.email || '',
            fullName: profileDoc.full_name || '',
            role: profileDoc.role as UserRole,
            ownerId: profileDoc.owner_id || profileDoc.id,
            isCompleted: profileDoc.is_completed ?? true,
            permissions: parsedPermissions,
          };
          localStorage.setItem('fuelleflow_user', JSON.stringify(userProfile));
          set({ user: userProfile, loading: false });
          return userProfile;
        }
      }
    } catch (_) {}

    set({ user: null, loading: false });
    return null;
  },

  setProfileCompleted: async (fullName, role) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const isDemo = currentUser.email.startsWith('demo_') || currentUser.email.includes('demo.com');

    const updatedUser: UserProfile = {
      ...currentUser,
      fullName,
      role,
      isCompleted: true,
    };

    if (!isDemo) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: fullName,
          role,
          owner_id: currentUser.id,
          is_completed: true,
          permissions: currentUser.permissions
        });

      if (error) throw error;
    }

    localStorage.setItem('fuelleflow_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  addAgent: async (email, password) => {
    const currentUser = get().user;
    if (!currentUser) throw new Error("Non connecté");

    // En mode démo, on simule l'ajout (ne fait rien de réel)
    if (currentUser.email.startsWith('demo_') || currentUser.email.includes('demo.com')) {
      return;
    }

    try {
      // Create a secondary client to avoid logging out the current admin
      const { createClient } = await import('@supabase/supabase-js');
      const secondarySupabase = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await secondarySupabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erreur lors de la création du compte agent.");

      // Insert profile for the new agent, linking it to the current admin's ownerId
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: "Agent de Carburant",
        role: "agent",
        owner_id: currentUser.ownerId || currentUser.id,
        is_completed: true,
        permissions: {
          can_refill: true,
          can_add_vehicle: false,
          can_add_driver: false,
          can_view_reports: false,
          can_manage_users: false,
        }
      });

      if (profileError) throw profileError;
    } catch (err: any) {
      throw new Error(err.message || "Impossible d'ajouter l'agent.");
    }
  }
}));
