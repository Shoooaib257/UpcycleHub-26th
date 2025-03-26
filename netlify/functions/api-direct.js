// Simple Netlify function in CommonJS format to avoid build issues

// In-memory user storage (will reset on function cold starts)
const users = [];
let lastUserId = 1000;

// Netlify Function handler
exports.handler = async function(event, context) {
  // Log out the event to help with debugging
  console.log('Netlify function received event:', {
    httpMethod: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters
  });
  
  try {
    // Extract path from the event
    const path = event.path.replace('/.netlify/functions/api-direct', '');
    console.log('Processing path:', path);
    
    // Parse request body if it exists
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(
          event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64').toString('utf-8') 
            : event.body
        );
        console.log('Request body:', JSON.stringify(requestBody).substring(0, 200));
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    
    // Handle user registration/signup
    if (event.httpMethod === 'POST' && path === '/auth/register') {
      console.log('Handling registration request');
      
      const { email, password, name } = requestBody;
      
      if (!email) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Email is required'
          })
        };
      }
      
      // Check if user already exists
      const existingUser = users.find(user => user.email === email);
      if (existingUser) {
        console.log(`User with email ${email} already exists`);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'User with this email already exists'
          })
        };
      }
      
      // Create new user
      const userId = ++lastUserId;
      const newUser = {
        id: userId,
        email,
        password, // In a real app, this would be hashed
        name: name || email.split('@')[0],
        isSeller: true,
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      console.log(`Created new user: ${email}, total users: ${users.length}`);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userWithoutPassword
        })
      };
    }
    
    // Handle login requests
    if (event.httpMethod === 'POST' && path === '/auth/login') {
      console.log('Handling login request with mock response');
      
      // Extract email and password from request body
      // But accept any credentials - don't validate against previous signups
      let email = "user@example.com";
      
      if (requestBody && requestBody.email) {
        email = requestBody.email;
        console.log(`Login attempt with email: ${email}`);
      } else {
        console.log('No email provided, using default');
      }
      
      // Check if the user exists in our in-memory store
      const existingUser = users.find(user => user.email === email);
      let userResponse;
      
      if (existingUser) {
        // User exists, return their stored data
        console.log(`Found existing user: ${email}`);
        const { password: _, ...userWithoutPassword } = existingUser;
        userResponse = userWithoutPassword;
      } else {
        // No user found, create a fake one for this session
        console.log(`No existing user found for ${email}, creating fake login`);
        userResponse = {
          id: 1000,
          email: email,
          name: email.split('@')[0] || "Test User",
          isSeller: true,
          createdAt: new Date().toISOString()
        };
      }
      
      // Always return successful login
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userResponse
        })
      };
    }
    
    // For auth/me endpoints, return the mock user
    if (event.httpMethod === 'GET' && path === '/auth/me') {
      console.log('Handling auth/me request with mock response');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: {
            id: 1000,
            email: "user@example.com",
            name: "Test User",
            isSeller: true,
            createdAt: new Date().toISOString()
          }
        })
      };
    }
    
    // Handle product creation
    if (event.httpMethod === 'POST' && path === '/products') {
      console.log('Handling product creation with mock response');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: 'Product created successfully', 
          success: true,
          product: {
            id: Math.floor(Math.random() * 1000),
            title: requestBody.title || 'Sample Product',
            description: requestBody.description || 'This is a temporary solution until the server functions properly',
            price: requestBody.price || 1000,
            createdAt: new Date().toISOString()
          }
        })
      };
    } 
    // Handle image uploads
    else if (event.httpMethod === 'POST' && path.includes('/products/') && path.includes('/images')) {
      console.log('Handling image upload with mock response');
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: 'Image uploaded successfully', 
          success: true,
          image: {
            id: Math.floor(Math.random() * 1000),
            url: 'https://example.com/placeholder.jpg',
            isMain: path.includes('isMain=true'),
            createdAt: new Date().toISOString()
          }
        })
      };
    }
    // Get products
    else if (event.httpMethod === 'GET' && path === '/products') {
      console.log('Handling get products request with mock response');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          products: [
            {
              id: 1,
              title: 'Vintage Camera',
              description: 'A beautiful vintage camera in excellent condition',
              price: 12500,
              category: 'Photography',
              condition: 'Excellent',
              location: 'Portland, OR',
              sellerId: 1000,
              status: 'active',
              views: 14,
              createdAt: new Date().toISOString()
            },
            {
              id: 2,
              title: 'Upcycled Wooden Chair',
              description: 'Handcrafted chair made from reclaimed wood',
              price: 8900,
              category: 'Furniture',
              condition: 'Like New',
              location: 'Seattle, WA',
              sellerId: 1001,
              status: 'active',
              views: 23,
              createdAt: new Date().toISOString()
            }
          ]
        })
      };
    }
    // For other requests, provide a generic response
    else {
      console.log('Handling generic request with mock response for:', path);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: 'API endpoint response', 
          path: path,
          method: event.httpMethod,
          success: true
        })
      };
    }
  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Internal server error', 
        error: error.message
      })
    };
  }
}; 