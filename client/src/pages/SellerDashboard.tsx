import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Package, 
  Eye, 
  MessageCircle, 
  Edit, 
  Trash, 
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

const SellerDashboard = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth?view=login");
      return;
    }
    
    // No need to check if the user is a seller anymore
    // as all logged-in users will have access to the dashboard
  }, [user, navigate]);

  // If still checking auth status, show loading
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Fetch seller products
  const { data, isLoading } = useQuery({
    queryKey: ['/api/products/seller'],
    queryFn: async () => {
      // In a real implementation, this would fetch only the user's listings
      // For now, we'll fetch all products and filter on the client side
      const res = await apiRequest('GET', '/api/products', undefined);
      const data = await res.json();
      return {
        ...data,
        products: data.products.filter((p: any) => p.sellerId === user?.id)
      };
    },
    enabled: Boolean(user),
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest('DELETE', `/api/products/${productId}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/seller'] });
      toast({
        title: "Product deleted",
        description: "Your listing has been removed successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setProductToDelete(null);
    }
  });

  const handleDeleteProduct = (productId: number) => {
    setProductToDelete(productId);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct.mutate(productToDelete);
    }
  };

  const products = data?.products || [];
  
  // Stats for dashboard cards
  const activeListings = products.filter(p => p.status === 'active').length;
  const totalViews = products.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
  
  // For the active conversations stat, we would need to fetch conversations
  // Since we don't have that endpoint yet, we'll use a placeholder
  const activeConversations = 5;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Seller Dashboard</h2>
        <Link href="/add-product">
          <Button className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add New Listing
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary rounded-md p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">Active Listings</dt>
                  <dd>
                    <div className="text-lg font-medium text-neutral-900">
                      {isLoading ? (
                        <div className="h-6 bg-neutral-200 rounded w-8 animate-pulse"></div>
                      ) : (
                        activeListings
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-600 rounded-md p-3">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">Total Views</dt>
                  <dd>
                    <div className="text-lg font-medium text-neutral-900">
                      {isLoading ? (
                        <div className="h-6 bg-neutral-200 rounded w-12 animate-pulse"></div>
                      ) : (
                        totalViews
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-amber-500 rounded-md p-3">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-neutral-500 truncate">Active Conversations</dt>
                  <dd>
                    <div className="text-lg font-medium text-neutral-900">
                      {isLoading ? (
                        <div className="h-6 bg-neutral-200 rounded w-8 animate-pulse"></div>
                      ) : (
                        activeConversations
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product listings table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Your Listed Items</h3>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse p-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center py-4 border-b border-neutral-200">
                <div className="flex-shrink-0 h-16 w-16 bg-neutral-200 rounded-md"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-neutral-200 rounded w-16"></div>
                <div className="ml-4 h-6 bg-neutral-200 rounded w-20"></div>
                <div className="ml-4 h-4 bg-neutral-200 rounded w-12"></div>
                <div className="ml-4 h-4 bg-neutral-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-600">You don't have any listings yet.</p>
            <Link href="/add-product">
              <Button className="mt-4">
                Add Your First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Listed Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-neutral-200 rounded-md overflow-hidden">
                        {/* We would fetch product images here */}
                        <div className="h-full w-full bg-neutral-300"></div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">{product.title}</div>
                        <div className="text-sm text-neutral-500">{product.category}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-900">${(product.price / 100).toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : product.status === 'sold'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">{product.views || 0}</TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {product.createdAt 
                      ? format(new Date(product.createdAt), 'MMM d, yyyy')
                      : 'Recently'
                    }
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/product/${product.id}`}>View</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/edit-product/${product.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={productToDelete !== null} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your listing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellerDashboard;
