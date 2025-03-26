const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://nemnixxpjftakcgvkpvn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbW5peHhwamZ0YWtjZ3ZrcHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MTc0NjksImV4cCI6MjA1ODQ5MzQ2OX0.l2naVD6XZeHo1x6rbw4mrBOOlCtkjqyxNi6evKM6EIM';

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

    // Get auth token from headers
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    // Create a new Supabase client with the user's session
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      }
    });
    
    // Handle auth endpoints
    if (method === 'POST' && path === '/auth/login') {
      const { email, password } = body;
      
      console.log(`Login attempt: ${email}`);
      
      // Use Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: authError.message,
            success: false
          })
        };
      }

      // Get user profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user: { ...authData.user, ...profileData },
          message: "Login successful" 
        })
      };
    }
    
    if (method === 'POST' && path === '/auth/register') {
      const { email, password, fullName, username, isSeller, isCollector } = body;
      
      console.log(`Registration attempt: ${email}`);
      
      // Create user in Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: authError.message,
            success: false
          })
        };
      }

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username,
          full_name: fullName,
          is_seller: isSeller,
          is_collector: isCollector,
          avatar_url: null,
        }])
        .select()
        .single();

      if (profileError) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: profileError.message,
            success: false
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          user: { ...authData.user, ...profileData },
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
      
      // Get products from Supabase
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: error.message,
            success: false
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products
        })
      };
    }
    
    // Handle product creation
    if (method === 'POST' && path === '/products') {
      console.log('Creating product with data:', body);
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: 'Authentication required',
            success: false
          })
        };
      }
      
      // Transform the data to match Supabase column names
      const productData = {
        ...body,
        seller_id: body.sellerId, // Transform sellerId to seller_id
        created_at: new Date().toISOString(),
        views: 0
      };
      delete productData.sellerId; // Remove the original sellerId
      
      // Create product in Supabase
      const { data: product, error } = await supabase
        .from('products')
        .insert([productData])
        .select(`
          *,
          seller:profiles(*)
        `)
        .single();

      if (error) {
        console.error('Error creating product:', error);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: error.message,
            success: false
          })
        };
      }
      
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
      
      // Delete product from Supabase
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: error.message,
            success: false
          })
        };
      }
      
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
    }
    
    // Handle conversations endpoint
    if (method === 'GET' && path.startsWith('/conversations')) {
      console.log('Fetching conversations');
      
      // Get conversations from Supabase
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          product:products(*),
          buyer:profiles(*),
          seller:profiles(*)
        `);

      if (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            error: error.message,
            success: false
          })
        };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversations
        })
      };
    }
    
    // Default response for unhandled paths
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Endpoint not found',
        success: false
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