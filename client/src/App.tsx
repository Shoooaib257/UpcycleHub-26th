import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages to reduce initial bundle size
const Home = lazy(() => import("@/pages/Home"));
const Browse = lazy(() => import("@/pages/Browse"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const SellerDashboard = lazy(() => import("@/pages/SellerDashboard"));
const AddProduct = lazy(() => import("@/pages/AddProduct"));
const Messages = lazy(() => import("@/pages/Messages"));
const About = lazy(() => import("@/pages/About"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Auth = lazy(() => import("@/pages/Auth"));

// Loading fallback component for code splitting
const PageSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <Skeleton className="h-12 w-3/4 mb-6" />
    <Skeleton className="h-64 w-full mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/browse" component={Browse} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/dashboard" component={SellerDashboard} />
        <Route path="/add-product" component={AddProduct} />
        <Route path="/messages" component={Messages} />
        <Route path="/messages/:conversationId" component={Messages} />
        <Route path="/about" component={About} />
        <Route path="/auth" component={Auth} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <AppHeader />
          <main className="flex-grow">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
