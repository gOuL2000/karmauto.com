import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * GET /api/favicon - Serve site logo as favicon
 * This route handler serves the site logo as favicon dynamically
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await getSiteSettings();
    
    // If logo exists, fetch and return it
    if (settings.logoUrl) {
      // If logo is a data URL, return it
      if (settings.logoUrl.startsWith('data:')) {
        const [header, base64] = settings.logoUrl.split(',');
        const mimeMatch = header.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const buffer = Buffer.from(base64, 'base64');
        
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=3600, must-revalidate',
          },
        });
      }
      
      // If logo is a URL or relative path, fetch it
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin;
        let logoUrl = settings.logoUrl;
        
        // If relative path, make it absolute
        if (logoUrl.startsWith('/')) {
          logoUrl = `${baseUrl}${logoUrl}`;
        }
        
        // Fetch the logo
        const response = await fetch(logoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });
        
        if (response.ok) {
          const imageBuffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'image/png';
          
          return new NextResponse(imageBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600, must-revalidate',
            },
          });
        }
      } catch (error) {
        console.error('Error fetching logo for favicon:', error);
      }
    }
    
    // Fallback: return 404
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error('Error in favicon route:', error);
    return new NextResponse(null, { status: 404 });
  }
}

