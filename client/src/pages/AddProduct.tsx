import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertProductSchema, Product, ProductImage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ImageUpload from "@/components/ImageUpload";
import { ArrowLeft } from "lucide-react";

// Extend the product schema with custom validations
const productFormSchema = insertProductSchema.extend({
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Price must be a positive number"
    ),
  category: z.string().refine(
    (value) => value !== "select_category" && value.trim() !== "",
    "Please select a valid category"
  ),
  condition: z.string().refine(
    (value) => value !== "select_condition" && value.trim() !== "",
    "Please select a valid condition"
  ),
  sellerId: z.string().uuid(),
});

// Transform the form values to the API format
type ProductFormValues = z.infer<typeof productFormSchema> & { price: string };

type CreateProductResponse = {
  product: Product;
  message: string;
};

type CreateProductImageResponse = {
  image: ProductImage;
  message: string;
};

const AddProduct = () => {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [uploadedImages, setUploadedImages] = useState<{ url: string; isMain: boolean }[]>([]);
  
  // Initialize form with default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      category: "",
      condition: "",
      location: "",
      sellerId: "",
      status: "active",
    },
  });

  // Create product mutation
  const { mutate: createProduct, isPending } = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to create a product");
      }

      // Transform price from dollars to cents
      const priceInCents = Math.round(parseFloat(values.price) * 100);
      
      // Create the product
      const data = await apiRequest<CreateProductResponse>("/products", {
        method: "POST",
        data: {
          ...values,
          price: priceInCents,
          sellerId: user.id,
        },
      });
      
      // Handle image uploads if needed
      if (uploadedImages.length > 0 && data.product?.id) {
        const imagePromises = uploadedImages.map(async (image) => {
          return apiRequest<CreateProductImageResponse>(`/products/${data.product.id}/images`, {
            method: "POST",
            data: {
              url: image.url,
              isMain: image.isMain,
              productId: data.product.id,
            },
          });
        });
        
        await Promise.all(imagePromises);
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Product added",
        description: "Your item has been listed successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/products"] });
      queryClient.invalidateQueries({ queryKey: ["/products/seller"] });
      
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating listing",
        description: error.message || "Failed to add product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      form.setValue("sellerId", user.id);
    } else {
      navigate("/auth?view=login");
    }
  }, [user, form, navigate]);

  // Handle form submission
  const onSubmit = (values: ProductFormValues) => {
    if (uploadedImages.length === 0) {
      toast({
        title: "Images required",
        description: "Please add at least one image for your product.",
        variant: "destructive",
      });
      return;
    }
    
    createProduct(values);
  };

  // Handle image upload
  const handleImageUploaded = (url: string, isMain: boolean) => {
    setUploadedImages((prev) => {
      if (isMain) {
        return [...prev.map(img => ({ ...img, isMain: false })), { url, isMain }];
      }
      return [...prev, { url, isMain }];
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        className="mb-4 flex items-center"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Add New Listing</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>
                Provide the details of the item you're listing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Vintage Camera, Refurbished Headphones, etc." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="select_category">Select a category</SelectItem>
                        <SelectItem value="Clothing">Clothing</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Home Goods">Home Goods</SelectItem>
                        <SelectItem value="Photography">Photography</SelectItem>
                        <SelectItem value="Vintage">Vintage</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-neutral-500 sm:text-sm">$</span>
                      </div>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="0.00"
                          className="pl-7 pr-12"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="select_condition">Select condition</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Like New">Like New</SelectItem>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="For Parts">For Parts</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your item, its features, history, etc."
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                Add up to 6 photos of your item. The first image will be the cover photo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-3">
                <ImageUpload
                  productId={`temp-${user.id}-${Date.now()}`}
                  onImageUploaded={(url, isMain) => handleImageUploaded(url, true)}
                  isMainUpload={true}
                />
                
                {[...Array(5)].map((_, index) => (
                  <ImageUpload
                    key={`upload-${index}`}
                    productId={`temp-${user.id}-${Date.now()}-${index}`}
                    onImageUploaded={(url) => handleImageUploaded(url, false)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City, State</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Portland, OR" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Let buyers know where your item is located.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[150px]"
            >
              {isPending ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </div>
              ) : "Create Listing"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddProduct;
