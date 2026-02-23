/**
 * Route Wrapper
 * Simple wrapper for Next.js API routes
 */

/**
 * Wrap a route handler function
 * @param {Function} handler - The route handler function
 * @returns {Function} Wrapped handler
 */
function wrapRoute(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('[Route Wrapper] Error:', error);
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'خطای سرور',
        },
        { status: 500 }
      );
    }
  };
}

module.exports = {
  wrapRoute,
};
