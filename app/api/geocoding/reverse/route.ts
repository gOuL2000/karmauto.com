import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // درخواست به Nominatim از سمت سرور
    // ایجاد AbortController برای timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "Saded Car Parts Store/1.0",
            "Accept": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      const address = data.display_name || `${lat}, ${lng}`;

      return NextResponse.json({
        success: true,
        address,
        data,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // اگر خطا مربوط به timeout باشد
      if (fetchError.name === 'AbortError') {
        throw new Error("Request timeout: گرفتن آدرس بیش از حد طول کشید");
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Reverse geocoding error:", error);
    
    // در صورت خطا، فقط مختصات را برمی‌گردانیم
    const lat = request.nextUrl.searchParams.get("lat");
    const lng = request.nextUrl.searchParams.get("lng");
    
    return NextResponse.json({
      success: false,
      address: lat && lng ? `${lat}, ${lng}` : "Unknown location",
      error: error.message || "Failed to get address",
    });
  }
}
