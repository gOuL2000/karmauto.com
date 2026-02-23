import { NextRequest } from "next/server";
import { createPaymentRequest, getPaymentUrl } from "@/lib/payment/zarinpal";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { rateLimit } from "@/lib/rate-limit";

/** 30 payment requests per minute per IP */
const paymentRequestRateLimit = rateLimit(30, 60 * 1000);

export async function POST(request: NextRequest) {
  const rateLimitRes = paymentRequestRateLimit(request);
  if (rateLimitRes) return rateLimitRes;

  try {
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON in request body", 400, "INVALID_JSON");
    });

    const { amount, description, callbackUrl, mobile, email } = body;

    // اعتبارسنجی داده‌ها
    if (!amount || amount <= 0) {
      throw new AppError("مبلغ پرداخت نامعتبر است", 400, "INVALID_AMOUNT");
    }

    if (!description || typeof description !== "string" || description.trim() === "") {
      throw new AppError("توضیحات سفارش الزامی است", 400, "MISSING_DESCRIPTION");
    }

    if (!callbackUrl || typeof callbackUrl !== "string" || callbackUrl.trim() === "") {
      throw new AppError("آدرس بازگشت الزامی است", 400, "MISSING_CALLBACK_URL");
    }

    // ایجاد درخواست پرداخت
    const paymentResult = await createPaymentRequest({
      amount,
      description,
      callbackUrl,
      mobile,
      email,
    });

    if (paymentResult.status === 100 && paymentResult.authority) {
      return createSuccessResponse({
        authority: paymentResult.authority,
        paymentUrl: getPaymentUrl(paymentResult.authority),
      });
    }

    // اگر Merchant ID تنظیم نشده باشد، پیام واضح‌تری نمایش بده
    const errorMessage = paymentResult.errors?.message || "خطا در ایجاد درخواست پرداخت";
    const isMerchantIdError =
      errorMessage.includes("Merchant ID") ||
                              paymentResult.status === -11 ||
      !!paymentResult.errors?.validations?.merchant_id;

    throw new AppError(
      isMerchantIdError
          ? "درگاه پرداخت تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید."
          : errorMessage,
      isMerchantIdError ? 500 : 400,
      isMerchantIdError ? "MERCHANT_ID_NOT_SET" : "PAYMENT_REQUEST_FAILED",
      isMerchantIdError
        ? {
          code: "MERCHANT_ID_NOT_SET",
            message: "ZARINPAL_MERCHANT_ID در فایل .env.local تنظیم نشده است",
          }
        : paymentResult.errors
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
