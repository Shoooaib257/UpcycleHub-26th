import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  productId: string;
  onImageUploaded: (url: string, isMain?: boolean) => void;
  isMainUpload?: boolean;
}

const ImageUpload = ({ 
  productId, 
  onImageUploaded, 
  isMainUpload = false 
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Function to convert the file to a base64 string
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file input change
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    try {
      setIsUploading(true);
      
      // Convert file to base64 string
      const base64Image = await fileToBase64(file);
      
      // Set the image URL
      setImageUrl(base64Image);
      
      // Call the callback with the image URL
      onImageUploaded(base64Image, isMainUpload);
      
      // Clear the input value to allow uploading the same file again
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className={cn(
        "relative border border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-40",
        isMainUpload ? "border-primary" : "border-neutral-300",
        imageUrl ? "bg-neutral-50" : "bg-white"
      )}
    >
      {imageUrl ? (
        <div className="w-full h-full relative">
          <img 
            src={imageUrl} 
            alt="Uploaded" 
            className="w-full h-full object-contain" 
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 w-6 h-6 p-0"
            onClick={() => {
              setImageUrl(null);
              // You might want to notify the parent component about the removal
            }}
          >
            ×
          </Button>
        </div>
      ) : (
        <>
          <input
            type="file"
            id={`image-upload-${productId}`}
            className="sr-only"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <label
            htmlFor={`image-upload-${productId}`}
            className="cursor-pointer flex flex-col items-center justify-center w-full h-full"
          >
            <div className="flex flex-col items-center justify-center">
              <svg className="w-8 h-8 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-neutral-500">
                {isUploading ? "Uploading..." : (isMainUpload ? "Add cover image" : "Add image")}
              </span>
            </div>
          </label>
        </>
      )}
    </div>
  );
};

export default ImageUpload;
