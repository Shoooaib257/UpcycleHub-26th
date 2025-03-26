// Simple Netlify function that doesn't require Express
// Store data in memory (will persist until function cold starts)
let products = [];
let users = [];
let lastUserId = 1000;
let lastProductId = 1000;

exports.handler = async function(event, context) {
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
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: products
        })
      };
    }
    
    // Handle product creation
    if (method === 'POST' && path === '/products') {
      console.log('Creating product with data:', body);
      
      // Create a new product with incremented ID
      const product = {
        id: lastProductId++,
        ...body,
        createdAt: new Date().toISOString(),
        views: 0
      };
      
      // Add to products array
      products.push(product);
      
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

    // Handle product deletion
    if (method === 'DELETE' && path.startsWith('/products/')) {
      const productId = parseInt(path.split('/')[2]);
      console.log('Deleting product:', productId);
      
      // Find and remove the product
      const index = products.findIndex(p => p.id === productId);
      if (index !== -1) {
        products.splice(index, 1);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: true,
            message: "Product deleted successfully"
          })
        };
      } else {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: false,
            message: "Product not found"
          })
        };
      }
    }
    
    // Handle conversations endpoint
    if (method === 'GET' && path.startsWith('/conversations')) {
      console.log('Fetching conversations');
      
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
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message,
        success: false
      })
    };
  }
}; 