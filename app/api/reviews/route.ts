import { NextRequest, NextResponse } from "next/server";
import { getRows, getRow, runQuery } from "@/lib/db/index";

// GET - Fetch all reviews
export async function GET() {
  try {
    // Check if reviews table exists, if not return empty array
    const reviews = await getRows<any>(
      `SELECT id, name, rating, comment, createdAt 
       FROM reviews 
       WHERE approved = TRUE 
       ORDER BY createdAt DESC 
       LIMIT 50`
    ).catch(() => []);

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
    });
  } catch (error: any) {
    // If table doesn't exist, return empty array
    if (error.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({
        success: true,
        reviews: [],
      });
    }

    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        success: false,
        error: "خطا در دریافت نظرات",
      },
      { status: 500 }
    );
  }
}

// POST - Create a new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rating, comment } = body;

    // Validation
    if (!name || !comment || !rating) {
      return NextResponse.json(
        {
          success: false,
          error: "لطفاً تمام فیلدها را پر کنید",
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "امتیاز باید بین 1 تا 5 باشد",
        },
        { status: 400 }
      );
    }

    // Create reviews table if it doesn't exist
    await runQuery(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        approved BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {
      // Table might already exist, ignore error
    });

    // Insert review
    const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await runQuery(
      `INSERT INTO reviews (id, name, rating, comment, approved) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [reviewId, name.trim(), rating, comment.trim()]
    );

    // Fetch the created review
    const newReview = await getRow<any>(
      `SELECT id, name, rating, comment, createdAt 
       FROM reviews 
       WHERE id = ?`,
      [reviewId]
    );

    return NextResponse.json({
      success: true,
      review: {
        ...newReview,
        createdAt: newReview.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    
    // Handle duplicate key error
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          error: "این نظر قبلاً ثبت شده است",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "خطا در ثبت نظر. لطفاً دوباره تلاش کنید.",
      },
      { status: 500 }
    );
  }
}

