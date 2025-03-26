import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { 
  insertUserSchema, 
  insertProductSchema, 
  insertProductImageSchema,
  insertConversationSchema,
  insertMessageSchema
} from "@shared/schema";
import { z } from "zod";
import { UploadedFile } from "express-fileupload";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const clients = new Map<number, WebSocket>();
  
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message
        if (data.type === 'auth') {
          userId = data.userId;
          clients.set(userId, ws);
          console.log(`User ${userId} connected`);
          return;
        }
        
        // Handle chat messages
        if (data.type === 'chat' && userId) {
          const { conversationId, content } = data;
          
          // Create the message
          const newMessage = await storage.createMessage({
            conversationId,
            senderId: userId,
            content
          });
          
          // Get the conversation to find both users
          const conversation = await storage.getConversation(conversationId);
          
          if (conversation) {
            // Determine the recipient (the other user in the conversation)
            const recipientId = (conversation.buyerId === userId) 
              ? conversation.sellerId 
              : conversation.buyerId;
            
            // Send to recipient if they're online
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'message',
                data: newMessage
              }));
            }
            
            // Send confirmation back to sender
            ws.send(JSON.stringify({
              type: 'message_sent',
              data: newMessage
            }));
          }
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  // User Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already in use' });
      }
      
      const user = await storage.createUser(userData);
      
      // Remove password from the response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ user: userWithoutPassword, message: 'User created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Store user in session
      if (req.session) {
        req.session.userId = user.id;
      }
      
      // Remove password from the response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });
  
  // Get currently logged in user
  app.get('/api/auth/me', async (req, res) => {
    try {
      // Check if user is logged in through session
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user from storage
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Logout user
  app.post('/api/auth/logout', (req, res) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to logout' });
          }
          res.json({ message: 'Logged out successfully' });
        });
      } else {
        res.json({ message: 'No active session' });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Product Routes
  app.get('/api/products', async (req, res) => {
    try {
      const { category } = req.query;
      
      let products;
      if (category && typeof category === 'string') {
        products = await storage.getProductsByCategory(category);
      } else {
        products = await storage.getAllProducts();
      }
      
      res.status(200).json({ products });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Increment view count
      await storage.incrementProductViews(productId);
      
      // Get product images
      const images = await storage.getProductImages(productId);
      
      res.status(200).json({ product, images });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      
      const product = await storage.createProduct(productData);
      
      res.status(201).json({ product, message: 'Product created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      const updatedProduct = await storage.updateProduct(productId, req.body);
      
      res.status(200).json({ product: updatedProduct, message: 'Product updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      await storage.deleteProduct(productId);
      
      res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete product' });
    }
  });

  app.post('/api/products/:id/images', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Make sure we're using the correct data structure from the request
      let imageData;
      try {
        imageData = insertProductImageSchema.parse({
          ...req.body,
          productId
        });
      } catch (error) {
        // Fallback for simpler format
        if (req.body.url) {
          imageData = {
            productId,
            url: req.body.url,
            isMain: req.body.isMain === true || req.body.isMain === 'true'
          };
        } else {
          throw error;
        }
      }
      
      const image = await storage.createProductImage(imageData);
      
      res.status(201).json({ image, message: 'Image added successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      console.error('Error adding image:', error);
      res.status(500).json({ message: 'Failed to add image' });
    }
  });

  app.get('/api/products/:id/images', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }
      
      const images = await storage.getProductImages(productId);
      
      res.status(200).json({ images });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch images' });
    }
  });
  
  // Simple in-memory image storage as fallback when Supabase storage isn't working
  const inMemoryImages = new Map<string, { data: string, contentType: string }>();
  
  app.post('/api/products/upload-image', async (req, res) => {
    // TypeScript type workaround
    const reqWithFiles = req as any;
    try {
      if (!reqWithFiles.files || Object.keys(reqWithFiles.files).length === 0) {
        // If raw file data is included in the request body (e.g. data URL)
        if (req.body.imageData && req.body.productId) {
          const imageId = `${req.body.productId}-${Date.now()}`;
          const imageData = req.body.imageData.toString();
          
          // Store the data URL directly
          inMemoryImages.set(imageId, {
            data: imageData,
            contentType: 'image/png' // Assume PNG for data URLs
          });
          
          // Store in our database too
          await storage.createProductImage({
            productId: parseInt(req.body.productId),
            url: `data:${imageId}`, // Use a custom URI scheme
            isMain: req.body.isMain === 'true'
          });
          
          return res.status(200).json({ 
            imageUrl: imageData,
            message: 'Image uploaded successfully (data URL)' 
          });
        }
        
        return res.status(400).json({ message: 'No files were uploaded' });
      }
      
      const productId = req.body.productId;
      const isMain = req.body.isMain === 'true';
      
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }
      
      // Handle the uploaded file
      const fileField = reqWithFiles.files.file;
      
      // Check if it's an array or single file
      if (Array.isArray(fileField)) {
        return res.status(400).json({ message: 'Only one file is allowed' });
      }
      
      const file = fileField;
      const imageId = `${productId}-${Date.now()}`;
      const contentType = file.mimetype;
      
      // For simplicity, just store in memory (would normally use disk)
      inMemoryImages.set(imageId, {
        data: file.data.toString('base64'),
        contentType
      });
      
      // Also store reference in our database
      await storage.createProductImage({
        productId: parseInt(productId),
        url: `/api/images/${imageId}`, // URL to access this image
        isMain
      });
      
      res.status(200).json({ 
        imageUrl: `/api/images/${imageId}`,
        message: 'Image uploaded successfully' 
      });
    } catch (error) {
      console.error('Error handling file upload:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });
  
  // Upload data URL directly (for fallback when file upload doesn't work)
  app.post('/api/products/upload-data-url', async (req, res) => {
    try {
      const { dataUrl, productId, isMain } = req.body;
      
      if (!dataUrl || !productId) {
        return res.status(400).json({ message: 'Data URL and product ID are required' });
      }
      
      const imageId = `${productId}-${Date.now()}`;
      
      // Store the data URL
      inMemoryImages.set(imageId, {
        data: dataUrl,
        contentType: dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
      });
      
      // Also store in database
      await storage.createProductImage({
        productId: parseInt(productId),
        url: `/api/images/${imageId}`,
        isMain: isMain === true || isMain === 'true'
      });
      
      res.status(200).json({ 
        imageUrl: `/api/images/${imageId}`,
        message: 'Image uploaded successfully (data URL fallback)'
      });
    } catch (error) {
      console.error('Error handling data URL upload:', error);
      res.status(500).json({ message: 'Failed to upload image data' });
    }
  });

  // Serve the in-memory images
  app.get('/api/images/:id', (req, res) => {
    try {
      const imageId = req.params.id;
      const image = inMemoryImages.get(imageId);
      
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      
      // For data URLs (simple case)
      if (image.data.startsWith('data:')) {
        // Redirect to the data URL
        return res.redirect(image.data);
      }
      
      // Set content type and send base64 data
      res.set('Content-Type', image.contentType);
      res.send(Buffer.from(image.data, 'base64'));
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).json({ message: 'Failed to serve image' });
    }
  });

  // Conversation Routes
  app.get('/api/conversations', async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const userIdInt = parseInt(userId);
      
      if (isNaN(userIdInt)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const conversations = await storage.getConversationsByUser(userIdInt);
      
      res.status(200).json({ conversations });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      
      // Check if a conversation already exists for these users and product
      const existingConversation = await storage.getConversationByUsers(
        conversationData.productId,
        conversationData.buyerId,
        conversationData.sellerId
      );
      
      if (existingConversation) {
        return res.status(200).json({ conversation: existingConversation, message: 'Conversation already exists' });
      }
      
      const conversation = await storage.createConversation(conversationData);
      
      res.status(201).json({ conversation, message: 'Conversation created successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const messages = await storage.getMessagesByConversation(conversationId);
      
      res.status(200).json({ messages });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId
      });
      
      const message = await storage.createMessage(messageData);
      
      res.status(201).json({ message, status: 'Message sent successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  return httpServer;
}
