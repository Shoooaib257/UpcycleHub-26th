require('dotenv').config();
const { Clerk } = require('@clerk/clerk-sdk-node');

// Initialize Clerk with your secret key
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

exports.handler = async (event, context) => {
  try {
    // Get the session token from the Authorization header
    const sessionToken = event.headers.authorization?.split(' ')[1];
    
    if (!sessionToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - No token provided' })
      };
    }

    try {
      // Verify the session token and get the user
      const session = await clerk.sessions.verifySession(sessionToken);
      const user = await clerk.users.getUser(session.userId);

      // Handle the authenticated request
      // ... your existing API logic here ...

    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - Invalid token' })
      };
    }

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 