import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSupabase, clearAuthState } from "@/lib/supabase";
import { User } from "@shared/schema";
import { Session } from "@supabase/supabase-js";

type PasswordStrength = {
  score: number;  // 0-4, where 4 is strongest
  feedback: string[];
  isStrong: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  checkPasswordStrength: (password: string) => PasswordStrength;
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
  const supabase = getSupabase();

  // Check for existing user session on load
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          return;
        }

        if (supabaseSession?.user) {
          setSession(supabaseSession);
          
          // Get user profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseSession.user.id)
            .single();

          if (profileError && !profileError.message.includes('No rows found')) {
            console.error("Error fetching profile:", profileError);
          }

          const userWithProfile: User = {
            id: supabaseSession.user.id,
            email: supabaseSession.user.email || "",
            username: profile?.username || supabaseSession.user.email?.split('@')[0] || 'user',
            fullName: profile?.full_name || supabaseSession.user.email?.split('@')[0] || 'User',
            avatar: profile?.avatar_url || null,
            isSeller: profile?.is_seller || false,
            isCollector: profile?.is_collector || true,
            createdAt: new Date(supabaseSession.user.created_at),
            password: 'dummy-password'
          };
          
          setUser(userWithProfile);
          localStorage.setItem("user", JSON.stringify(userWithProfile));
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (!session) {
        setUser(null);
        localStorage.removeItem("user");
      }
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

  const checkPasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    // Check length
    if (password.length < 8) {
      feedback.push("Password should be at least 8 characters long");
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Check for numbers
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add numbers for a stronger password");
    }

    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add special characters for a stronger password");
    }

    // Check for mixed case
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Use both upper and lower case letters");
    }

    // Check for common patterns
    const commonPatterns = [
      '123', '456', '789', 'abc', 'qwerty', 'password', 'admin'
    ];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      score = Math.max(0, score - 1);
      feedback.push("Avoid common patterns in your password");
    }

    // If password is strong enough but no feedback, add positive feedback
    if (score >= 3 && feedback.length === 0) {
      feedback.push("Strong password!");
    }

    return {
      score,
      feedback,
      isStrong: score >= 3
    };
  };

  const signup = async (userData: SignupData) => {
    setIsLoading(true);
    try {
      // Check password strength
      const passwordCheck = checkPasswordStrength(userData.password);
      if (!passwordCheck.isStrong) {
        throw new Error(`Password is not strong enough. ${passwordCheck.feedback.join(". ")}`);
      }

      // Clear any existing auth state
      await clearAuthState();

      // Normalize and validate email
      const email = userData.email.trim().toLowerCase();
      if (!email || !email.includes('@') || !email.includes('.')) {
        throw new Error("Please enter a valid email address. Example: user@example.com");
      }

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      // Create user with Supabase auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            username: userData.username,
            is_seller: userData.isSeller,
            is_collector: userData.isCollector,
            avatar_url: null
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        if (signUpError.status === 429) {
          throw new Error("Too many signup attempts. Please wait a few minutes before trying again.");
        }
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('Signup failed. Please try again.');
      }

      // Create profile in the profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: email,
            full_name: userData.fullName,
            username: userData.username,
            is_seller: userData.isSeller,
            is_collector: userData.isCollector,
            avatar_url: null
          }
        ]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      return { requiresEmailConfirmation: !data.session };

    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
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
    <AuthContext.Provider value={{ user, session, login, signup, logout, isLoading, checkPasswordStrength }}>
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
