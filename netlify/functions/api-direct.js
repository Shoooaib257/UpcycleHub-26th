// Simple Netlify function in CommonJS format to avoid build issues

const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// In-memory user storage (will reset on function cold starts)
const users = [];
let lastUserId = 1000;

// Auth endpoints - make sure paths match client expectations
app.post("/.netlify/functions/api-direct/auth/login", (req, res) => {
  const { email, password } = req.body;
  
  console.log(`Login attempt: ${email}`);
  
  // Find the user in our in-memory DB
  const user = users.find(u => u.email === email);
  
  if (user) {
    console.log(`Found existing user: ${user.email}`);
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ 
      user: userWithoutPassword,
      message: "Login successful" 
    });
  }
  
  // If user doesn't exist, create a mock user
  console.log(`Creating mock user for: ${email}`);
  const newUser = {
    id: ++lastUserId,
    uuid: `mock-${lastUserId}`,
    email: email || "user@example.com",
    username: email.split('@')[0],
    fullName: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
    avatar: null,
    isSeller: false,
    isCollector: true,
    createdAt: new Date().toISOString()
  };
  
  // Store the user
  users.push({...newUser, password});
  
  return res.json({ 
    user: newUser,
    message: "Login successful" 
  });
});

app.post("/.netlify/functions/api-direct/auth/register", (req, res) => {
  const { email, password, fullName, username, isSeller, isCollector } = req.body;
  
  console.log(`Registration attempt: ${email}`);
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  
  if (existingUser) {
    console.log(`User already exists: ${email}`);
    return res.status(400).json({ message: "User already exists" });
  }
  
  // Create new user
  const newUser = {
    id: ++lastUserId,
    uuid: `user-${lastUserId}`,
    email,
    username,
    fullName,
    avatar: null,
    isSeller: !!isSeller,
    isCollector: !!isCollector,
    createdAt: new Date().toISOString(),
    password // We would hash this in a real application
  };
  
  // Store the user (without exposing password)
  users.push(newUser);
  
  // Return user data without password
  const { password: _, ...userWithoutPassword } = newUser;
  
  console.log(`User registered successfully: ${email}`);
  
  return res.json({
    user: userWithoutPassword,
    message: "User registered successfully"
  });
});

app.get("/.netlify/functions/api-direct/auth/me", (req, res) => {
  // In a real app, we would use an auth token
  // For demo, we'll just return null (which means not logged in)
  return res.json({ user: null });
});

// Existing products endpoint
app.get("/api/products", (req, res) => {
  res.json({
    products: [
      {
        id: 1,
        name: "Upcycled Denim Bag",
        description: "Handcrafted bag made from recycled denim",
        price: 45.99,
        image: "https://example.com/denim-bag.jpg",
        category: "Accessories",
      },
      {
        id: 2,
        name: "Repurposed Wooden Chair",
        description: "Vintage chair restored with eco-friendly materials",
        price: 129.99,
        image: "https://example.com/wooden-chair.jpg",
        category: "Furniture",
      },
    ],
  });
});

// Also define routes without the /.netlify/functions/api-direct prefix for local development
app.post("/api/auth/login", (req, res) => {
  // Same handler as above
  const { email, password } = req.body;
  
  console.log(`Login attempt (local): ${email}`);
  
  // Find the user in our in-memory DB
  const user = users.find(u => u.email === email);
  
  if (user) {
    console.log(`Found existing user: ${user.email}`);
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ 
      user: userWithoutPassword,
      message: "Login successful" 
    });
  }
  
  // If user doesn't exist, create a mock user
  console.log(`Creating mock user for: ${email}`);
  const newUser = {
    id: ++lastUserId,
    uuid: `mock-${lastUserId}`,
    email: email || "user@example.com",
    username: email.split('@')[0],
    fullName: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '),
    avatar: null,
    isSeller: false,
    isCollector: true,
    createdAt: new Date().toISOString()
  };
  
  // Store the user
  users.push({...newUser, password});
  
  return res.json({ 
    user: newUser,
    message: "Login successful" 
  });
});

app.post("/api/auth/register", (req, res) => {
  // Same handler as above
  const { email, password, fullName, username, isSeller, isCollector } = req.body;
  
  console.log(`Registration attempt (local): ${email}`);
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  
  if (existingUser) {
    console.log(`User already exists: ${email}`);
    return res.status(400).json({ message: "User already exists" });
  }
  
  // Create new user
  const newUser = {
    id: ++lastUserId,
    uuid: `user-${lastUserId}`,
    email,
    username,
    fullName,
    avatar: null,
    isSeller: !!isSeller,
    isCollector: !!isCollector,
    createdAt: new Date().toISOString(),
    password // We would hash this in a real application
  };
  
  // Store the user (without exposing password)
  users.push(newUser);
  
  // Return user data without password
  const { password: _, ...userWithoutPassword } = newUser;
  
  console.log(`User registered successfully: ${email}`);
  
  return res.json({
    user: userWithoutPassword,
    message: "User registered successfully"
  });
});

app.get("/api/auth/me", (req, res) => {
  // Same handler as above
  return res.json({ user: null });
});

// The path must route to lambda
app.use("/.netlify/functions/api-direct", app);
// For local development
app.use("/api", app);

// Export the handler
module.exports.handler = serverless(app); 