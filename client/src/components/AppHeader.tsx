import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const AppHeader = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<"login" | "signup">("login");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const openLoginModal = () => {
    setAuthModalView("login");
    setIsAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthModalView("signup");
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="ml-2 text-xl font-bold text-neutral-800">Upcycle Hub</span>
            </Link>
            <nav className="hidden md:ml-6 md:flex md:space-x-8">
              <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 ${isActive('/') ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'} text-sm font-medium`}>
                Home
              </Link>
              <Link href="/browse" className={`inline-flex items-center px-1 pt-1 border-b-2 ${isActive('/browse') ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'} text-sm font-medium`}>
                Browse
              </Link>
              {user && (
                <Link href="/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 ${isActive('/dashboard') ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'} text-sm font-medium`}>
                  Sell
                </Link>
              )}
              <Link href="/about" className={`inline-flex items-center px-1 pt-1 border-b-2 ${isActive('/about') ? 'border-primary text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'} text-sm font-medium`}>
                About
              </Link>
            </nav>
          </div>

          {/* Auth Navigation Section */}
          <div className="flex items-center">
            {!user ? (
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  onClick={openLoginModal}
                  className="px-3 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-100"
                >
                  Log in
                </Button>
                <Button
                  onClick={openSignupModal}
                  className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-white hover:bg-emerald-700"
                >
                  Sign up
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/messages" className="relative p-1 rounded-full text-neutral-500 hover:text-neutral-700">
                  <MessageCircle className="h-6 w-6" />
                  {/* Notification dot - would be conditionally rendered based on unread messages */}
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-500 border-2 border-white"></span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center space-x-2 focus:outline-none"
                    >
                      <span className="text-sm font-medium text-neutral-700 hidden sm:inline-block">
                        {user.fullName}
                      </span>
                      <Avatar className="h-8 w-8">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.fullName} />
                        ) : (
                          <AvatarFallback className="bg-neutral-200 text-neutral-600">
                            {getInitials(user.fullName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Your Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="bg-white p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden" ref={mobileMenuRef}>
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className={`${isActive('/') ? 'bg-neutral-50 border-primary text-primary' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
              Home
            </Link>
            <Link href="/browse" className={`${isActive('/browse') ? 'bg-neutral-50 border-primary text-primary' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
              Browse
            </Link>
            {user && (
              <Link href="/dashboard" className={`${isActive('/dashboard') ? 'bg-neutral-50 border-primary text-primary' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                Sell
              </Link>
            )}
            <Link href="/about" className={`${isActive('/about') ? 'bg-neutral-50 border-primary text-primary' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
              About
            </Link>
            {user ? (
              <>
                <Link href="/messages" className={`${isActive('/messages') ? 'bg-neutral-50 border-primary text-primary' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                  Messages
                </Link>
                <Link href="/profile" className={`${isActive('/profile') ? 'bg-neutral-50 border-primary text-primary' : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}>
                  Profile
                </Link>
                <button 
                  onClick={logout}
                  className="border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={openLoginModal}
                  className="border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left"
                >
                  Log in
                </button>
                <button 
                  onClick={openSignupModal}
                  className="border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
        initialView={authModalView} 
      />
    </header>
  );
};

export default AppHeader;
