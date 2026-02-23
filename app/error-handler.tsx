"use client";

import { useEffect } from "react";

/** پیام‌های شناخته‌شده از افزونه‌های مرورگر یا محیط — در کنسول نشان داده نمی‌شوند */
function isSuppressedMessage(args: unknown[]): boolean {
  const str = args.map((a) => (a != null ? String(a) : "")).join(" ");
  return (
    str.includes("runtime.lastError") ||
    str.includes("Receiving end does not exist") ||
    str.includes("Unchecked runtime.lastError") ||
    str.includes("Could not establish connection") ||
    (str.includes("ERR_CONNECTION_REFUSED") && str.includes("127.0.0.1:7242"))
  );
}

/** پیام‌های فقط در حالت توسعه (DevTools، HMR، Fast Refresh) — اختیاری سرکوب */
function isDevNoise(args: unknown[]): boolean {
  const str = args.map((a) => (a != null ? String(a) : "")).join(" ");
  return (
    str.includes("Download the React DevTools") ||
    str.includes("[HMR] connected") ||
    /\[Fast Refresh\] (rebuilding|done)/.test(str)
  );
}

/** خطاهای اپ که در فرم/استور نشان داده می‌شوند — از کنسول حذف می‌شوند تا شلوغ نشود */
function isSuppressedAppError(args: unknown[]): boolean {
  const str = args.map((a) => (a != null ? String(a) : "")).join(" ");
  if (
    process.env.NODE_ENV === "development" &&
    (str.includes("Error loading cart from database") ||
      str.includes("Failed to load cart from database") ||
      str.includes("Error loading vehicles") ||
      str.includes("Failed to load vehicles"))
  ) {
    return true;
  }
  if (str.includes("Login error:") || str.includes("Registration error:")) return true;
  if (str.includes("Error loading users from DB") && str.includes("نشست منقضی شده")) return true;
  return false;
}

/**
 * سرکوب خطا/هشدار افزونه مرورگر و بخشی از خطاهای تکراری اپ.
 * خطای «Receiving end does not exist» و مشابه از افزونه‌ها است، نه از کد شما.
 */
export function ErrorHandler() {
  useEffect(() => {
    const origError = window.console.error;
    const origWarn = window.console.warn;
    const origInfo = window.console.info;

    window.console.error = (...args: unknown[]) => {
      if (isSuppressedMessage(args) || isSuppressedAppError(args)) return;
      origError.apply(window.console, args);
    };

    window.console.warn = (...args: unknown[]) => {
      if (isSuppressedMessage(args)) return;
      origWarn.apply(window.console, args);
    };

    window.console.info = (...args: unknown[]) => {
      if (isSuppressedMessage(args) || isDevNoise(args)) return;
      origInfo.apply(window.console, args);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() ?? "";
      if (
        reason.includes("runtime.lastError") ||
        reason.includes("Receiving end does not exist") ||
        reason.includes("Could not establish connection") ||
        (reason.includes("ERR_CONNECTION_REFUSED") && reason.includes("127.0.0.1:7242"))
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.console.error = origError;
      window.console.warn = origWarn;
      window.console.info = origInfo;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

