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

      // Create user with Supabase auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            username: userData.username,
            is_seller: userData.isSeller,
            is_collector: userData.isCollector,
            avatar_url: null
          },
          emailRedirectTo: `${window.location.origin}/auth?view=login`
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        
        if (signUpError.message?.includes('rate limit')) {
          throw new Error(
            "We're experiencing high traffic. Please try again in a few minutes or contact support if the issue persists."
          );
        }
        
        throw new Error(signUpError.message || 'Failed to create account');
      }

      if (!data.user) {
        throw new Error('No user data returned from signup');
      }

      // Set session if available
      if (data.session) {
        setSession(data.session);
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: userData.email,
            full_name: userData.fullName,
            username: userData.username,
            is_seller: userData.isSeller,
            is_collector: userData.isCollector,
            avatar_url: null
          }
        ]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway as the auth user was created
      }

      // Create user object for state
      const userWithProfile: User = {
        id: data.user.id,
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        avatar: null,
        isSeller: userData.isSeller,
        isCollector: userData.isCollector,
        createdAt: new Date(data.user.created_at),
        password: 'dummy-password' // Required by User type but never used
      };
      
      setUser(userWithProfile);
      localStorage.setItem("user", JSON.stringify(userWithProfile));

      // Show success message
      console.log('Account created successfully. Please check your email for verification.');
      
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
