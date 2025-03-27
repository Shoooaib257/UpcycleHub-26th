import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Toaster } from '@/components/ui/toaster';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import AddProduct from '@/pages/AddProduct';
import ProductDetails from '@/pages/ProductDetails';

const App = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route 
              path="/dashboard" 
              element={
                isSignedIn ? <Dashboard /> : <Navigate to="/" replace />
              } 
            />
            <Route 
              path="/add-product" 
              element={
                isSignedIn ? <AddProduct /> : <Navigate to="/" replace />
              } 
            />
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </Router>
  );
};

export default App;
