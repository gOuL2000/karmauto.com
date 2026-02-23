import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/api-route-helpers";

/**
 * GET /api/placeholder/[width]/[height] - Generate placeholder image
 * 
 * Returns a simple SVG placeholder image
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    // Next.js 16+ uses Promise for params
    const resolvedParams = await params;
    // Parse width and height from params
    const [width = "600", height = "600"] = resolvedParams.params || [];
    const w = parseInt(width, 10) || 600;
    const h = parseInt(height, 10) || 600;

    // Generate SVG placeholder
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text 
          x="50%" 
          y="50%" 
          font-family="Arial, sans-serif" 
          font-size="24" 
          fill="#9ca3af" 
          text-anchor="middle" 
          dominant-baseline="middle"
        >
          ${w} × ${h}
        </text>
      </svg>
    `.trim();

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

