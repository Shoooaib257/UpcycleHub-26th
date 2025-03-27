import { useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';

const ProductDetails = () => {
  const { id } = useParams();
  const { isSignedIn } = useUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg">
            {/* Add product image here */}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {/* Add thumbnail images here */}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Product Title</h1>
            <p className="text-2xl font-semibold mt-2">$XX.XX</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-muted-foreground">
              Product description will be displayed here.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Condition</h2>
            <p className="text-muted-foreground">Like New</p>
          </div>

          {isSignedIn ? (
            <Button className="w-full" size="lg">
              Contact Seller
            </Button>
          ) : (
            <Button className="w-full" size="lg" variant="secondary">
              Sign in to Contact Seller
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails; 