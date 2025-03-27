import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { User } from "@shared/schema";
import { Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

type SignupData = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  isSeller: boolean;
  isCollector: boolean;
};

// Define our mock user type for authentication
type MockUser = Omit<User, 'password'> & { password?: string };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user session on load
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Try to load user from localStorage first
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          console.log("Loaded user from localStorage:", parsedUser);
        }

        // Try to get session from Supabase
        const supabase = getSupabase();
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          // Continue with localStorage user if available
        } else if (supabaseSession?.user) {
          setSession(supabaseSession);
          const sessionEmail = supabaseSession.user.email || "";
          const mockUser: MockUser = {
            id: supabaseSession.user.id, // Use the UUID directly as ID
            email: sessionEmail,
            username: supabaseSession.user.user_metadata?.username || sessionEmail.split('@')[0] || 'user',
            fullName: supabaseSession.user.user_metadata?.full_name || sessionEmail.split('@')[0] || 'User',
            avatar: supabaseSession.user.user_metadata?.avatar || null,
            isSeller: supabaseSession.user.user_metadata?.is_seller || false,
            isCollector: supabaseSession.user.user_metadata?.is_collector || true,
            createdAt: new Date(supabaseSession.user.created_at)
          };
          
          // Add a dummy password since the User type expects it
          const userWithPassword: User = {
            ...mockUser,
            password: 'dummy-password' // This is never actually used
          };
          
          setUser(userWithPassword);
          localStorage.setItem("user", JSON.stringify(userWithPassword));
        }
      } catch (error) {
        console.error("Error checking user:", error);
        // Continue with localStorage user if available
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
    
    // Set up session change listener
    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("Attempting login for:", email);
      
      // Authenticate with Supabase
      const supabase = getSupabase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error(
            "Invalid email or password. Please check your credentials and try again."
          );
        }
        throw authError;
      }

      if (!data.session) {
        console.error("No session returned after login");
        throw new Error("Login failed. Please try again.");
      }

      // Set the session
      console.log("Login successful, setting session");
      setSession(data.session);

      // Get user profile data
      console.log("Fetching user profile");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Continue with basic user data
      }

      // Create user object
      const userWithProfile: User = {
        id: data.session.user.id,
        email: data.session.user.email || "",
        username: profile?.username || data.session.user.email?.split('@')[0] || 'user',
        fullName: profile?.full_name || data.session.user.email?.split('@')[0] || 'User',
        avatar: profile?.avatar_url || null,
        isSeller: profile?.is_seller || true,
        isCollector: profile?.is_collector || true,
        createdAt: new Date(data.session.user.created_at),
        password: 'dummy-password' // Required by User type but never used
      };
      
      console.log("Setting user data:", { ...userWithProfile, password: '[REDACTED]' });
      setUser(userWithProfile);
      localStorage.setItem("user", JSON.stringify(userWithProfile));
      
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData) => {
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      
      // Clear any existing auth data
      await supabase.auth.signOut();
      localStorage.removeItem("user");
      
      // First, check if email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existingUser) {
        throw new Error('Email already registered. Please use a different email or try logging in.');
      }

      // Create user directly with Supabase auth API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          data: {
            full_name: userData.fullName,
            username: userData.username,
            is_seller: userData.isSeller,
            is_collector: userData.isCollector,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Signup error:', data);
        // If we still hit rate limit, try alternative method
        if (response.status === 429) {
          // Fallback to direct profile creation
          const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
          });

          if (signInError) {
            throw new Error('Unable to create account. Please try again later.');
          }

          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                email: userData.email,
                full_name: userData.fullName,
                username: userData.username,
                is_seller: userData.isSeller,
                is_collector: userData.isCollector,
              }
            ]);

          if (profileError) {
            throw new Error('Failed to create user profile. Please try again.');
          }

          setUser({
            id: authData.user.id,
            email: userData.email,
            fullName: userData.fullName,
            username: userData.username,
            isSeller: userData.isSeller,
            isCollector: userData.isCollector,
            createdAt: new Date(),
            password: 'dummy-password',
            avatar: null  // Add missing avatar field
          });

          return;
        }
        throw new Error(data.error?.message || 'Failed to create account');
      }

      // Successfully created user
      const { user: newUser, session } = data;
      
      if (session) {
        setSession(session);
      }

      const userWithProfile: User = {
        id: newUser.id,
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        avatar: null,
        isSeller: userData.isSeller,
        isCollector: userData.isCollector,
        createdAt: new Date(newUser.created_at),
        password: 'dummy-password' // Required by User type but never used
      };
      
      setUser(userWithProfile);
      localStorage.setItem("user", JSON.stringify(userWithProfile));
      
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Just clear the user from state and localStorage
      setUser(null);
      localStorage.removeItem("user");
      
      // Optional: Try to sign out from Supabase too, but don't worry if it fails
      try {
        const supabase = getSupabase();
        await supabase.auth.signOut();
      } catch (e) {
        console.log("Supabase signout failed, but that's okay");
      }
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
