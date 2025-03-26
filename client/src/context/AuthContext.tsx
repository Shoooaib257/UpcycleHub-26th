import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

type AuthContextType = {
  user: User | null;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing user session on load
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Try to get the current user from our API
        const res = await apiRequest('GET', '/api/auth/me');
        const data = await res.json();
        
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          // Fallback to localStorage if API fails
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
        // Fallback to localStorage if API fails
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
    
    return () => {
      // Cleanup
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log("Attempting login with Netlify function");
      const res = await apiRequest('POST', '/api/auth/login', { 
        email, 
        password 
      });
      
      const data = await res.json();
      
      if (!data.user) {
        throw new Error("Login failed - no user data returned");
      }
      
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("Login successful:", data.user);
      
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
      console.log("Attempting signup with Netlify function");
      const res = await apiRequest('POST', '/api/auth/register', userData);
      
      const data = await res.json();
      
      if (!data.user) {
        throw new Error("Signup failed - no user data returned");
      }
      
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("Signup successful:", data.user);
      
      return data.user;
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
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
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
