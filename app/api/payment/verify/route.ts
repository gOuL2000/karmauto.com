import { NextRequest } from "next/server";
import { verifyPayment } from "@/lib/payment/zarinpal";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { rateLimit } from "@/lib/rate-limit";

/** 30 verify requests per minute per IP */
const paymentVerifyRateLimit = rateLimit(30, 60 * 1000);

export async function POST(request: NextRequest) {
  const rateLimitRes = paymentVerifyRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { authority, amount } = body;

    // اعتبارسنجی داده‌ها
    if (!authority || typeof authority !== "string" || authority.trim() === "") {
      throw new AppError("Authority نامعتبر است", 400, "INVALID_AUTHORITY");
    }

    if (!amount || amount <= 0) {
      throw new AppError("مبلغ پرداخت نامعتبر است", 400, "INVALID_AMOUNT");
    }

    // تایید پرداخت
    const verificationResult = await verifyPayment(authority, amount);

    if (verificationResult.status === 100 && verificationResult.refId) {
      return createSuccessResponse({
        success: true,
        refId: verificationResult.refId,
        message: "پرداخت با موفقیت انجام شد",
      });
    }

    // مدیریت خطاهای مختلف
    const errorMessage =
      verificationResult.errors?.message || "خطا در تایید پرداخت";

    throw new AppError(
      errorMessage,
      400,
      "PAYMENT_VERIFICATION_FAILED",
      verificationResult.errors
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
