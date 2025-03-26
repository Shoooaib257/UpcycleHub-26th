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
      // First, check if we can reuse a stored user with this email
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.email === email) {
          console.log("Reusing stored user with matching email");
          // Make sure the user has seller privileges
          if (!parsedUser.isSeller) {
            parsedUser.isSeller = true;
            localStorage.setItem("user", JSON.stringify(parsedUser));
          }
          setUser(parsedUser);
          return;
        }
      }

      // If no stored user matches, create a mock user without hitting Supabase
      console.log("Creating mock user for login");
      const mockUser: User = {
        id: crypto.randomUUID(), // Generate a proper UUID
        email: email,
        username: email.split('@')[0],
        fullName: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
        avatar: null,
        isSeller: true, // Always set to true
        isCollector: true,
        createdAt: new Date(),
        password: password // Include the password to satisfy the User type
      };
      
      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
      
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
      console.log("Creating mock user for signup");
      
      // Create a mock user without hitting Supabase
      const mockUser: User = {
        id: crypto.randomUUID(), // Generate a proper UUID
        email: userData.email,
        username: userData.username,
        fullName: userData.fullName,
        avatar: null,
        isSeller: userData.isSeller,
        isCollector: userData.isCollector,
        createdAt: new Date(),
        password: userData.password // Include the password to satisfy the User type
      };
      
      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
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
