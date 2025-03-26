import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import ProductGrid from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

const Home = () => {
  const { user } = useAuth();

  // Fetch featured products
  const { data: featuredData, isLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/products', undefined);
      return res.json();
    },
  });

  // Fetch product images
  const { data: imagesData } = useQuery({
    queryKey: ['/api/products/images'],
    queryFn: async () => {
      // Get all product IDs from featuredData
      if (!featuredData || !featuredData.products || !featuredData.products.length) {
        return { images: {} };
      }
      
      // For each product, fetch its images
      const productImagesMap: Record<number, any[]> = {};
      
      await Promise.all(
        featuredData.products.slice(0, 4).map(async (product: any) => {
          const res = await apiRequest('GET', `/api/products/${product.id}/images`, undefined);
          const data = await res.json();
          productImagesMap[product.id] = data.images || [];
        })
      );
      
      return { images: productImagesMap };
    },
    enabled: Boolean(featuredData?.products?.length),
  });

  // Get just the first 4 products for the featured section
  const featuredProducts = featuredData?.products?.slice(0, 4) || [];
  const productImages = imagesData?.images || {};

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative">
        <div className="bg-primary rounded-xl overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
              alt="Sustainable marketplace background" 
              className="h-full w-full object-cover opacity-20"
            />
          </div>
          <div className="relative px-4 py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Give Items a New Life
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-white sm:max-w-3xl">
              Join our community of eco-conscious sellers and collectors to buy, sell, and trade pre-loved items.
            </p>
            <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
              <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
                <Link href="/browse">
                  <Button className="flex items-center justify-center px-4 py-3 w-full border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                    Browse Items
                  </Button>
                </Link>
                <Link href={user ? "/dashboard" : "/auth"}>
                  <Button variant="outline" className="flex items-center justify-center px-4 py-3 w-full border border-transparent text-base font-medium rounded-md shadow-sm text-neutral-700 bg-white hover:bg-neutral-50">
                    Start Selling
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base font-semibold text-primary uppercase tracking-wide">How It Works</h2>
            <p className="mt-1 text-3xl font-extrabold text-neutral-900 sm:text-4xl sm:tracking-tight">
              Simple, Sustainable, Social
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-sm">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-neutral-900 tracking-tight">Create Your Account</h3>
                    <p className="mt-5 text-base text-neutral-500">
                      Sign up as a seller, collector, or both. Set up your profile and get ready to join our sustainable community.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-sm">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-neutral-900 tracking-tight">List or Browse Items</h3>
                    <p className="mt-5 text-base text-neutral-500">
                      Sellers can easily list pre-loved items with photos. Collectors can browse and discover unique treasures.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-sm">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-neutral-900 tracking-tight">Chat & Complete</h3>
                    <p className="mt-5 text-base text-neutral-500">
                      Connect through our chat system to discuss details, negotiate prices, and arrange your sustainable transaction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Items Section */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-neutral-900">Featured Items</h2>
            <Link href="/browse" className="text-primary hover:text-primary-dark text-sm font-medium">
              View all
            </Link>
          </div>
          
          {isLoading ? (
            <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="w-full min-h-80 bg-neutral-200 aspect-w-1 aspect-h-1 rounded-md"></div>
                  <div className="mt-4 flex justify-between">
                    <div>
                      <div className="h-4 bg-neutral-200 rounded w-24"></div>
                      <div className="mt-1 h-3 bg-neutral-200 rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-neutral-200 rounded w-12"></div>
                  </div>
                  <div className="mt-2 h-8 bg-neutral-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <ProductGrid 
                products={featuredProducts} 
                productImages={productImages}
              />
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            <span className="block">Ready to start upcycling?</span>
            <span className="block text-primary">Join our community today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Button 
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-emerald-700"
                onClick={() => {
                  // Open signup modal via auth context or navigate to signup page
                }}
              >
                Get started
              </Button>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link href="/learn-more">
                <Button 
                  variant="outline"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-white hover:bg-neutral-50"
                >
                  Learn more
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
