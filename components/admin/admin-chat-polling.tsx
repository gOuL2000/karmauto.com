"use client";

import { useGlobalChatPolling } from "@/hooks/use-global-chat-polling";
import { useNotificationStore } from "@/store/notification-store";

/**
 * Global chat polling for admin: وقتی پیام جدید از کاربر می‌رسد، اعلان به استور و در صورت تمایل به مرورگر اضافه می‌شود.
 * از notificationId یکسان استفاده می‌شود تا اعلان تکراری نسازیم و فقط به‌روز شود.
 */
export function AdminChatPolling() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  useGlobalChatPolling({
    isUser: false,
    onNewMessage: (_message, chatInfo) => {
      const chat = chatInfo as { id?: string; customerName?: string; unreadCount?: number } | undefined;
      const chatId = chat?.id;
      if (!chatId || !chatId.startsWith("chat-")) return; // فقط چت واقعی، نه user-chat-xxx
      if ((chat?.unreadCount ?? 0) === 0) return;

      // اگر دیالوگ اخیراً لیست خالی گرفته، اعلان نساز تا با «چت یافت نشد» تداخل نداشته باشد
      try {
        const emptyAt = sessionStorage.getItem("admin_chat_list_empty_at");
        if (emptyAt) {
          const elapsed = Date.now() - parseInt(emptyAt, 10);
          if (elapsed < 20000) return; // ۲۰ ثانیه
        }
      } catch {
        // ignore
      }

      const notificationId = `chat-admin-${chatId}`;
      const result = addNotification({
        type: "message",
        priority: "high",
        title: "پیام جدید از کاربر",
        message: chat.customerName ? `${chat.customerName} — پیام جدید` : "پیام جدید در چت",
        persistent: true,
        metadata: { chatId, isAdmin: true, notificationId },
      });
      // نوتیف مرورگر فقط هنگام اضافه شدن اعلان جدید، نه هر بار به‌روزرسانی
      if (result.isNew && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("پیام جدید از کاربر", {
            body: chat.customerName ? `${chat.customerName}` : "پیام جدید در چت",
          });
        } catch {
          // ignore
        }
      }
    },
  });

  return null;
}


