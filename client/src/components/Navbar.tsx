import { Link } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const { isSignedIn } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          Upcycle Hub
        </Link>

        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link to="/add-product">
                <Button>Add Product</Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 