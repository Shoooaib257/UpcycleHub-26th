import { createContext, useContext, ReactNode } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import type { User as ClerkUser } from "@clerk/clerk-react";

type AuthContextType = {
  user: ClerkUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { user } = useUser();

  const value = {
    user: user || null,
    isLoading: !isClerkLoaded,
    isSignedIn: !!isSignedIn,
  };

  return (
    <AuthContext.Provider value={value}>
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
