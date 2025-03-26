// Simple Netlify function that doesn't require Express
exports.handler = async function(event, context) {
  // Store user data in memory (will reset on function cold starts)
  const users = [];
  let lastUserId = 1000;

  try {
    // Extract path and method from the event
    const path = event.path.replace('/.netlify/functions/api-direct', '');
    const method = event.httpMethod;
    
    console.log(`Processing ${method} request to ${path}`);
    
    // Parse request body if it exists
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(
          event.isBase64Encoded 
            ? Buffer.from(event.body, 'base64').toString('utf-8') 
            : event.body
        );
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    
    // Handle auth endpoints
    if (method === 'POST' && path === '/auth/login') {
      const { email, password } = body;
      
      console.log(`Login attempt: ${email}`);
      
      // Find existing user or create a mock one
      const user = {
        id: lastUserId++,
        uuid: `mock-${Date.now()}`,
        email: email || "user@example.com",
        username: email ? email.split('@')[0] : "user",
        fullName: email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') : "User",
        avatar: null,
        isSeller: true,
        isCollector: true,
        createdAt: new Date().toISOString(),
        password: password || "password"
      };
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user: { ...user, password: undefined },
          message: "Login successful" 
        })
      };
    }
    
    if (method === 'POST' && path === '/auth/register') {
      const { email, password, fullName, username, isSeller, isCollector } = body;
      
      console.log(`Registration attempt: ${email}`);
      
      // Create a new mock user
      const user = {
        id: lastUserId++,
        uuid: `user-${Date.now()}`,
        email: email || "user@example.com",
        username: username || (email ? email.split('@')[0] : "user"),
        fullName: fullName || (email ? email.split('@')[0] : "User"),
        avatar: null,
        isSeller: isSeller !== undefined ? isSeller : true,
        isCollector: isCollector !== undefined ? isCollector : true,
        createdAt: new Date().toISOString(),
        password: password || "password"
      };
      
      users.push(user);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user: { ...user, password: undefined },
          message: "Registration successful" 
        })
      };
    }
    
    if (method === 'GET' && path === '/auth/me') {
      console.log('Handling auth/me request');
      
      // Return null to indicate not logged in
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: null
        })
      };
    }
    
    // Handle products endpoint
    if (method === 'GET' && path === '/products') {
      console.log('Fetching products');
      
      // Return mock products
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: [
            {
              id: 1,
              title: "Upcycled Denim Bag",
              description: "Handcrafted bag made from recycled denim",
              price: 4599, // in cents
              category: "Accessories",
              condition: "Like New",
              location: "Portland, OR",
              sellerId: 1000,
              status: "active",
              views: 14,
              createdAt: new Date().toISOString()
            },
            {
              id: 2,
              title: "Repurposed Wooden Chair",
              description: "Vintage chair restored with eco-friendly materials",
              price: 12999, // in cents
              category: "Furniture",
              condition: "Good",
              location: "Seattle, WA",
              sellerId: 1001,
              status: "active",
              views: 23,
              createdAt: new Date().toISOString()
            }
          ]
        })
      };
    }
    
    // Handle product creation
    if (method === 'POST' && path === '/products') {
      console.log('Creating product with data:', body);
      
      // Create a mock product
      const product = {
        id: Math.floor(Math.random() * 1000) + 1000,
        ...body,
        createdAt: new Date().toISOString(),
        views: 0
      };
      
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product,
          success: true,
          message: "Product created successfully"
        })
      };
    }
    
    // Handle conversations endpoint
    if (method === 'GET' && path.startsWith('/conversations')) {
      console.log('Fetching conversations');
      
      // Return empty conversations list
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversations: []
        })
      };
    }
    
    // Default response for unhandled paths
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `API endpoint processed: ${path}`,
        success: true
      })
    };
    
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