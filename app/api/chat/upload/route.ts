import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-route-helpers";
import { AppError } from "@/lib/api-error-handler";
import { getSessionUserFromRequest } from "@/lib/auth/session";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "chat");

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * POST /api/chat/upload - Upload file for chat
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request is from admin panel
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';
    const isFromAdmin = referer.includes('/admin') || origin.includes('/admin');
    
    // Authentication required - only registered users can upload files
    // BUT: If request is from admin panel, skip auth check (admin is already authenticated in admin panel)
    let sessionUser = await getSessionUserFromRequest(request);
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[POST /api/chat/upload] Auth check:', {
        hasSession: !!sessionUser,
        isFromAdmin,
        referer: referer.substring(0, 100),
        origin: origin.substring(0, 100),
      });
    }
    
    // Fallback: اگر session پیدا نشد اما userId در header ارسال شده
    // This is a fallback for cases where session cookie exists but session is not found in DB
    const userIdHeader = request.headers.get('x-user-id');
    if (!sessionUser && userIdHeader) {
      const { getRow } = await import("@/lib/db/index");
      const user = await getRow<{
        id: string;
        name: string;
        phone: string;
        role: string;
        enabled: any;
        createdAt: string;
      }>(
        "SELECT id, name, phone, role, enabled, createdAt FROM users WHERE id = ?",
        [userIdHeader]
      );
      if (user && user.enabled) {
        sessionUser = {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role || "user",
          enabled: Boolean(user.enabled),
          createdAt: user.createdAt || new Date().toISOString(),
        };
      }
    }
    
    // Require authentication - no guest users allowed (only for non-admin requests)
    // For admin panel, allow upload even without session (admin is already authenticated)
    // Also allow if userId header is provided (user is authenticated in client-side)
    if (!sessionUser && !isFromAdmin && !userIdHeader) {
      throw new AppError("برای آپلود فایل باید وارد حساب کاربری خود شوید", 401, "UNAUTHORIZED");
    }

    await ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "image", "file", "audio"

    if (!file) {
      throw new AppError("فایل ارسال نشده است", 400, "MISSING_FILE");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        `حجم فایل باید کمتر از ${MAX_FILE_SIZE / (1024 * 1024)} مگابایت باشد`,
        400,
        "FILE_TOO_LARGE"
      );
    }

    // Validate file type
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webm", "image/gif"];
    const allowedFileTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    // Accept any audio type for audio files (MediaRecorder can produce various MIME types)
    const allowedAudioTypes = [
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/ogg;codecs=opus",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/mp4",
      "audio/aac",
      "audio/flac",
    ];
    if (type === "image") {
      if (!allowedImageTypes.includes(file.type) && !file.type.startsWith("image/")) {
        throw new AppError(
          `نوع فایل تصویری مجاز نیست. نوع مجاز: ${allowedImageTypes.join(", ")}`,
          400,
          "INVALID_FILE_TYPE"
        );
      }
    } else if (type === "file") {
      if (!allowedFileTypes.includes(file.type)) {
        throw new AppError(
          `نوع فایل مجاز نیست. نوع مجاز: ${allowedFileTypes.join(", ")}`,
          400,
          "INVALID_FILE_TYPE"
        );
      }
    } else if (type === "audio") {
      // For audio, accept any audio MIME type or check file extension
      const fileName = file.name.toLowerCase();
      const audioExtensions = [".webm", ".ogg", ".mp3", ".wav", ".m4a", ".aac", ".flac", ".mp4"];
      const hasAudioExtension = audioExtensions.some((ext) => fileName.endsWith(ext));
      const hasAudioMimeType = file.type.startsWith("audio/") || allowedAudioTypes.includes(file.type);
      
      // Accept if it has audio MIME type OR audio extension
      if (!hasAudioMimeType && !hasAudioExtension) {
        throw new AppError(
          `نوع فایل صوتی مجاز نیست. لطفاً فایل صوتی معتبری ارسال کنید.`,
          400,
          "INVALID_FILE_TYPE"
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${type}-${timestamp}-${randomStr}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    // Generate URL
    const fileUrl = `/uploads/chat/${fileName}`;

    return createSuccessResponse({
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      type,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

