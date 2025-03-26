import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

type AuthProps = {
  params?: {
    view?: "login" | "signup";
  }
};

const Auth = ({ params }: AuthProps) => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const initialView = params?.view || "login";

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate(user.isSeller ? "/dashboard" : "/");
    }
  }, [user, navigate]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    navigate("/"); // Go back to home page when modal is closed
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialView={initialView as "login" | "signup"}
      />
    </div>
  );
};

export default Auth; 