import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import CountdownTimer from "./CountdownTimer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialView: "login" | "signup";
};

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  isSeller: z.boolean(),
  isCollector: z.boolean(),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  })
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const AuthModal = ({ isOpen, onClose, initialView }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<string>(initialView);
  const { login, signup, checkPasswordStrength } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
    isStrong: boolean;
  }>({ score: 0, feedback: [], isStrong: false });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      isSeller: false,
      isCollector: true,
      terms: false,
    },
  });

  const handleLoginSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      await login(values.email, values.password);
      toast({
        title: "Login successful",
        description: "You have been logged in successfully.",
      });
      onClose();
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (values: z.infer<typeof signupSchema>) => {
    try {
      setIsLoading(true);
      setRetryAttempt(0);
      
      await signup({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        username: values.username,
        isSeller: values.isSeller,
        isCollector: values.isCollector,
      });
      
      toast({
        title: "Sign up successful",
        description: "Please check your email for verification instructions.",
      });
      
      onClose();
    } catch (error: any) {
      console.error("Signup error:", error);
      
      if (error.message?.includes('rate limit') || error.message?.includes('Too many signup attempts')) {
        setIsRateLimited(true);
        setRetryAttempt(prev => prev + 1);
        const waitTime = Math.min(300, Math.pow(2, retryAttempt) * 30); // Cap at 5 minutes
        
        toast({
          title: "Please wait",
          description: `Too many attempts. Please wait ${Math.round(waitTime/60)} minutes before trying again.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign up failed",
          description: error.message || "An error occurred during sign up.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add password strength check handler
  const handlePasswordChange = (value: string) => {
    const strength = checkPasswordStrength(value);
    setPasswordStrength(strength);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Welcome to Upcycle Hub
          </DialogTitle>
          <DialogDescription>
            Log in to your account or create a new one to start buying and selling.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          {/* Login Tab */}
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={loginForm.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Remember me</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <a href="#" className="text-sm font-medium text-primary hover:text-primary-dark">
                    Forgot password?
                  </a>
                </div>
                
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting || isLoading}>
                  {isLoading ? "Signing in..." : (loginForm.formState.isSubmitting ? "Signing in..." : "Sign in")}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          {/* Signup Tab */}
          <TabsContent value="signup">
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
                {isRateLimited ? (
                  <div className="p-4 bg-neutral-100 rounded-lg text-center">
                    <p className="text-sm text-neutral-600 mb-2">
                      Too many signup attempts. Please wait before trying again.
                    </p>
                    <CountdownTimer
                      initialSeconds={Math.min(300, Math.pow(2, retryAttempt) * 30)}
                      onComplete={() => {
                        setIsRateLimited(false);
                        setRetryAttempt(0);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <FormField
                      control={signupForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Create a strong password" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                handlePasswordChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <div className="mt-2">
                            <Progress value={(passwordStrength.score / 4) * 100} className="h-1" />
                            <div className="mt-2 text-sm">
                              {passwordStrength.feedback.map((feedback, index) => (
                                <div 
                                  key={index} 
                                  className={`text-sm ${
                                    feedback === "Strong password!" 
                                      ? "text-green-600" 
                                      : "text-orange-600"
                                  }`}
                                >
                                  {feedback}
                                </div>
                              ))}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-4">
                      <FormField
                        control={signupForm.control}
                        name="isSeller"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I want to sell items</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="isCollector"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I want to collect items</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signupForm.control}
                        name="terms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I agree to the terms and conditions</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </>
                )}
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
