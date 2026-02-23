/**
 * Authentication Middleware
 * For Next.js API routes
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token and attach user to request
 */
function authenticateToken(req) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(handler) {
  return async (req, context) => {
    const user = authenticateToken(req);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Attach user to request
    req.user = user;
    return handler(req, context);
  };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(handler) {
  return async (req, context) => {
    const user = authenticateToken(req);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (user.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    req.user = user;
    return handler(req, context);
  };
}

/**
 * Optional auth - attach user if token exists
 */
export function optionalAuth(handler) {
  return async (req, context) => {
    const user = authenticateToken(req);
    if (user) {
      req.user = user;
    }
    return handler(req, context);
  };
}




