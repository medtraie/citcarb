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
  addAgent: (email: string, password: string, fullName?: string) => Promise<void>;
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
  }
};

async function resolveAdminOwnerId(email: string, profileDoc?: any, authUserId?: string): Promise<string> {
  const lowerEmail = (email || '').toLowerCase().trim();

  // Pure demo accounts only
  if (lowerEmail.startsWith('demo_') || lowerEmail.endsWith('@demo.com')) {
    return 'demo_admin_uid';
  }

  // If this profile is admin or email contains admin, ownerId is ALWAYS their own Supabase Auth UID!
  if (profileDoc?.role === 'admin' || lowerEmail.includes('admin')) {
    return profileDoc?.id || authUserId || '';
  }

  // If already properly linked to a real admin ID (not demo)
  if (profileDoc?.owner_id && profileDoc.owner_id !== profileDoc.id && profileDoc.owner_id !== 'demo_admin_uid') {
    return profileDoc.owner_id;
  }

  // Auto-link non-admin / agent to the real admin account in Supabase
  try {
    // Look up the admin profile in Supabase
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (adminProfile?.id) {
      if (profileDoc?.id) {
        await supabase.from('profiles').upsert({
          id: profileDoc.id,
          email: email,
          full_name: profileDoc.full_name || 'Utilisateur / Agent',
          role: 'agent',
          owner_id: adminProfile.id,
          is_completed: true
        });
      }
      return adminProfile.id;
    }
  } catch (e) {
    console.warn('Error resolving admin owner id:', e);
  }

  return authUserId || profileDoc?.owner_id || profileDoc?.id || '';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    const lowerEmail = email.trim().toLowerCase();

    // Demo Mode Auth ONLY for @demo.com
    if (lowerEmail.startsWith('demo_') || lowerEmail.endsWith('@demo.com')) {
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
          can_view_reports: true,
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
      let authDataResult: any = null;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // If agent doesn't exist yet, attempt automatic signup
        if (lowerEmail.includes('user') || lowerEmail.includes('agent')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });
          if (signUpError) throw authError;
          authDataResult = signUpData;
        } else {
          throw authError;
        }
      } else {
        authDataResult = authData;
      }

      if (!authDataResult?.user) throw new Error('Erreur de connexion');

      const { data: profileDoc, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authDataResult.user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Erreur lors de la récupération du profil: ${profileError.message}`);
      }

      const isAgentAccount = lowerEmail.includes('user') || lowerEmail.includes('agent') || (profileDoc?.role === 'agent');
      const resolvedOwnerId = await resolveAdminOwnerId(authDataResult.user.email || email, profileDoc, authDataResult.user.id);

      let userProfile: UserProfile;

      if (!profileDoc) {
        // Nouveau profil à compléter
        userProfile = {
          id: authDataResult.user.id,
          email: authDataResult.user.email || email,
          fullName: isAgentAccount ? 'Utilisateur / Agent' : 'Administrateur',
          role: isAgentAccount ? 'agent' : 'admin',
          ownerId: resolvedOwnerId,
          isCompleted: true,
          permissions: {
            can_refill: true,
            can_add_vehicle: !isAgentAccount,
            can_add_driver: !isAgentAccount,
            can_view_reports: true,
            can_manage_users: !isAgentAccount,
          }
        };

        // Sauvegarder dans Supabase
        await supabase.from('profiles').upsert({
          id: userProfile.id,
          email: userProfile.email,
          full_name: userProfile.fullName,
          role: userProfile.role,
          owner_id: userProfile.ownerId,
          is_completed: true
        });
      } else {
        // Maper les permissions du JSON
        const userRole = isAgentAccount ? 'agent' : (profileDoc.role as UserRole || 'admin');
        const parsedPermissions = {
          can_refill: true,
          can_add_vehicle: userRole === 'admin',
          can_add_driver: userRole === 'admin',
          can_view_reports: true,
          can_manage_users: userRole === 'admin',
        };

        if (profileDoc.permissions && typeof profileDoc.permissions === 'object') {
          Object.assign(parsedPermissions, profileDoc.permissions);
        }

        userProfile = {
          id: profileDoc.id,
          email: profileDoc.email || authDataResult.user.email || '',
          fullName: profileDoc.full_name || (isAgentAccount ? 'Utilisateur / Agent' : 'Administrateur'),
          role: userRole,
          ownerId: resolvedOwnerId,
          isCompleted: profileDoc.is_completed ?? true,
          permissions: parsedPermissions,
        };

        if (profileDoc.owner_id !== resolvedOwnerId || profileDoc.role !== userRole) {
          await supabase.from('profiles').update({
            owner_id: resolvedOwnerId,
            role: userRole
          }).eq('id', profileDoc.id);
        }
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
    const isDemo = get().user?.email.endsWith('@demo.com');
    
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
        // Purge if non-demo account has stale demo_admin_uid or missing ownerId
        if (!user.email.endsWith('@demo.com') && (user.ownerId === 'demo_admin_uid' || !user.ownerId)) {
          localStorage.removeItem('fuelleflow_user');
        } else {
          set({ user, loading: false });
          return user;
        }
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

        const userEmail = session.user.email || profileDoc?.email || '';
        const isAgentAccount = userEmail.toLowerCase().includes('user') || userEmail.toLowerCase().includes('agent') || (profileDoc?.role === 'agent');
        const resolvedOwnerId = await resolveAdminOwnerId(userEmail, profileDoc, session.user.id);
        const userRole = isAgentAccount ? 'agent' : ((profileDoc?.role as UserRole) || 'admin');

        const parsedPermissions = {
          can_refill: true,
          can_add_vehicle: userRole === 'admin',
          can_add_driver: userRole === 'admin',
          can_view_reports: true,
          can_manage_users: userRole === 'admin',
        };

        if (profileDoc?.permissions && typeof profileDoc.permissions === 'object') {
          Object.assign(parsedPermissions, profileDoc.permissions);
        }

        const userProfile: UserProfile = {
          id: session.user.id,
          email: userEmail,
          fullName: profileDoc?.full_name || (isAgentAccount ? 'Utilisateur / Agent' : 'Administrateur'),
          role: userRole,
          ownerId: resolvedOwnerId,
          isCompleted: profileDoc?.is_completed ?? true,
          permissions: parsedPermissions,
        };
        localStorage.setItem('fuelleflow_user', JSON.stringify(userProfile));
        set({ user: userProfile, loading: false });
        return userProfile;
      }
    } catch (_) {}

    set({ user: null, loading: false });
    return null;
  },

  setProfileCompleted: async (fullName, role) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const isDemo = currentUser.email.startsWith('demo_') || currentUser.email.endsWith('@demo.com');

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
          owner_id: currentUser.ownerId || currentUser.id,
          is_completed: true,
          permissions: currentUser.permissions
        });

      if (error) throw error;
    }

    localStorage.setItem('fuelleflow_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  addAgent: async (email, password, fullName) => {
    const currentUser = get().user;
    if (!currentUser) throw new Error("Non connecté");

    const agentName = fullName?.trim() || "Utilisateur / Agent";
    const lowerEmail = email.trim().toLowerCase();
    const adminOwnerId = currentUser.ownerId || currentUser.id;

    // En mode démo pure
    if (currentUser.ownerId === 'demo_admin_uid' || currentUser.email.endsWith('@demo.com')) {
      const existing = localStorage.getItem('fuel_flow_demo_agents');
      const agents = existing ? JSON.parse(existing) : [];
      agents.push({
        id: `demo_agent_${Date.now()}`,
        email: lowerEmail,
        full_name: agentName,
        role: 'agent',
        owner_id: 'demo_admin_uid',
        permissions: {
          can_refill: true,
          can_add_vehicle: false,
          can_add_driver: false,
          can_view_reports: true,
          can_manage_users: false,
        },
        is_completed: true,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('fuel_flow_demo_agents', JSON.stringify(agents));
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
        email: lowerEmail,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erreur lors de la création du compte agent.");

      // Insert profile for the new agent, strictly linking it to the current admin's ownerId in Supabase
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email: lowerEmail,
        full_name: agentName,
        role: "agent",
        owner_id: adminOwnerId,
        is_completed: true,
        permissions: {
          can_refill: true,
          can_add_vehicle: false,
          can_add_driver: false,
          can_view_reports: true,
          can_manage_users: false,
        }
      });

      if (profileError) throw profileError;
    } catch (err: any) {
      throw new Error(err.message || "Impossible d'ajouter l'agent.");
    }
  }
}));
