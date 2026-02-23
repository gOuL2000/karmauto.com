import { healthCheckHandler } from "@/lib/monitoring/health-check";

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  return healthCheckHandler();
}


