import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialView: "login" | "signup";
};

const AuthModal = ({ isOpen, onClose, initialView }: AuthModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <Tabs defaultValue={initialView} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <SignIn 
              routing="virtual"
              afterSignInUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none p-0",
                  header: "hidden",
                  footer: "hidden"
                }
              }}
            />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignUp 
              routing="virtual"
              afterSignUpUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full shadow-none p-0",
                  header: "hidden",
                  footer: "hidden"
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
