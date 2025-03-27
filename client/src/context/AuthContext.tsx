import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
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
      // Check password strength before proceeding
      const passwordCheck = checkPasswordStrength(userData.password);
      if (!passwordCheck.isStrong) {
        throw new Error(`Password is not strong enough. ${passwordCheck.feedback.join(". ")}`);
      }

      const supabase = getSupabase();
      
      // Clear any existing auth data and sessions
      await supabase.auth.signOut();
      localStorage.removeItem("user");
      localStorage.removeItem("supabase.auth.token");
      sessionStorage.removeItem("supabase.auth.token");

      // Validate and normalize email
      const email = userData.email.trim().toLowerCase();
      if (!email) {
        throw new Error("Email is required");
      }

      // Basic email validation
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error("Please enter a valid email address. Example: user@example.com");
      }

      const [localPart, domain] = email.split('@');
      if (!localPart || !domain || !domain.includes('.')) {
        throw new Error("Please enter a valid email address. Example: user@example.com");
      }

      // Additional email format validation
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format. Please use only letters, numbers, and common symbols. Example: user@example.com");
      }

      // Check if email already exists
      try {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email)
          .single();

        if (checkError && !checkError.message.includes('No rows found')) {
          console.error('Error checking existing user:', checkError);
        } else if (existingUser) {
          throw new Error('An account with this email already exists. Please login instead.');
        }
      } catch (error: any) {
        if (error.message.includes('exists')) {
          throw error;
        }
        // If there's an error checking (other than exists), continue with signup
        console.warn('Error checking existing user:', error);
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
        console.error('Signup error:', signUpError);
        if (signUpError.status === 429) {
          throw new Error("Too many signup attempts. Please try again in a few minutes.");
        } else if (signUpError.message?.toLowerCase().includes('email')) {
          throw new Error("Please enter a valid email address. Example: user@example.com");
        } else if (signUpError.message?.includes('password')) {
          throw new Error("Password must be at least 6 characters long");
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

      // Set session if available
      if (data.session) {
        setSession(data.session);
        
        const userWithProfile: User = {
          id: data.user.id,
          email: email,
          username: userData.username,
          fullName: userData.fullName,
          avatar: null,
          isSeller: userData.isSeller,
          isCollector: userData.isCollector,
          createdAt: new Date(data.user.created_at),
          password: 'dummy-password'
        };
        
        setUser(userWithProfile);
        localStorage.setItem("user", JSON.stringify(userWithProfile));
      }

      return { requiresEmailConfirmation: !data.session };

    } catch (error: any) {
      console.error("Signup error:", error);
      // Add delay if rate limit was hit
      if (error.status === 429 || error.message?.includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
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
