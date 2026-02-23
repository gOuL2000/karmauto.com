"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send,
  MessageCircle,
  Phone,
  Mail,
  Image,
  Paperclip,
  MapPin,
  FileText,
  X,
  Mic,
  Square,
  Pause,
  Loader2,
  Check,
  CheckCheck,
  Trash2,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { AudioPlayer } from "@/components/chat/audio-player";
import { useNotifications } from "@/hooks/use-notifications";
import { OnlineStatusBadge } from "@/components/chat/online-status-badge";
import { useAdminPresence } from "@/hooks/use-admin-presence";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { logger } from "@/lib/logger-client";
import { useAuthStore } from "@/store/auth-store";
import { ProtectedRoute } from "@/components/auth/protected-route";
import type { Message } from "@/components/chat/chat-types";
import type { Attachment } from "@/components/chat/chat-types";
import { useChatMessagesPage } from "@/hooks/use-chat-messages-page";

function ChatPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { showNotification, requestPermission } = useNotifications();
  const { isOnline, lastSeen, checkStatus } = useAdminPresence({
    enabled: true,
    heartbeatInterval: 20000,
  });
  const { user, isAuthenticated } = useAuthStore();
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [step, setStep] = useState<"info" | "chat">("chat");
  
  // Load customer info from auth store (chat is protected, so we expect an authenticated user)
  const loadCustomerInfo = useCallback(() => {
    if (typeof window === "undefined") return { name: "", phone: "", email: "" };
    
    // ProtectedRoute ensures user exists, so we can safely use it
    if (user) {
      return {
        name: user.name || "",
        phone: user.phone || "",
        email: "",
      };
    }
    return { name: "", phone: "", email: "" };
  }, [user]);

  const [customerInfo, setCustomerInfo] = useState(loadCustomerInfo);
  
  // Update customer info when auth state changes
  useEffect(() => {
    const updatedInfo = loadCustomerInfo();
    setCustomerInfo(updatedInfo);
  }, [user, loadCustomerInfo]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const {
    messages,
    setMessages,
    pollForNewMessages,
    isSupportTyping,
  } = useChatMessagesPage(chatId, {
    enabled: step === "chat" && !!user,
    onUnauthorized: () =>
      router.push("/auth?redirect=" + encodeURIComponent("/chat")),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const hasScrolledOnOpenRef = useRef<boolean>(false);
  const shouldAutoSendRef = useRef<boolean>(false);

  // Initialize user's chat (server-side, session-based)
  const initMyChat = useCallback(async (opts?: { silent?: boolean }) => {
    // Authentication removed - chat is now open to everyone
    try {
      
      // Wait a bit to ensure cookie is available (especially after login)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Retry mechanism for cookie availability
      let res: Response | null = null;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Get user from store to send as header in development
          const currentUser = useAuthStore.getState().user;
          const headers: Record<string, string> = {
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
          };
          
          // Add userId header in development as fallback
          if (process.env.NODE_ENV === 'development' && currentUser?.id) {
            headers['x-user-id'] = currentUser.id;
          }
          
          res = await fetch("/api/chat/my", { 
            method: "GET",
            credentials: "include", // CRITICAL: Must include credentials to send cookies
            cache: "no-store",
            headers,
          });
          
          // If successful, break out of retry loop
          if (res.ok) {
            break;
          }
          
          // If 401, session might be invalid - check auth again
          if (res.status === 401) {
            // Re-check authentication
            const recheck = await fetch("/api/auth/me", {
              credentials: "include",
              cache: "no-store",
            });
            const recheckData = await recheck.json().catch(() => null);
            
            if (!recheck.ok || !recheckData?.success || !recheckData?.data?.authenticated) {
              // Session is definitely invalid
              if (!opts?.silent) {
                router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
              }
              return null;
            }
            
            // Session is valid but chat endpoint failed - retry
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
          }
          
          // For other errors, break
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!res) {
        throw lastError || new Error("Failed to fetch chat");
      }
      
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data?.chatId) {
        // Authentication removed - no redirect needed
        const msg = json?.error || json?.message || "خطا در دریافت چت";
        throw new Error(msg);
      }
      const id = String(json.data.chatId);
      setChatId(id);
      try {
        window.localStorage.setItem("quickBuyChat_chatId", id);
      } catch {
        // ignore
      }
      setStep("chat");
      return id;
    } catch (e) {
      if (!opts?.silent) {
        toast({
          title: "خطا",
          description: e instanceof Error ? e.message : "خطا در دریافت چت",
          variant: "destructive",
        });
      }
      return null;
    }
  }, [toast]);

  // Auto-init chat once user is available
  // ProtectedRoute ensures user exists, so we can safely use it
  useEffect(() => {
    if (!user) return; // ProtectedRoute should handle this
    if (chatId) return;
    
    // Add delay to ensure cookie is available (especially after login redirect)
    // This gives browser time to process the Set-Cookie header
    const timeoutId = setTimeout(() => {
      initMyChat({ silent: true }).catch(() => null);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [user, chatId, initMyChat]);

  // با باز کردن چت، read-state را به‌روز کن و اعلان را بی‌درنگ صفر کن + یک refetch برای همگام با سرور
  useEffect(() => {
    if (!chatId || step !== "chat") return;
    const setReadState = async () => {
      try {
        await fetch("/api/chat/read-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ chatId }),
        });
        window.dispatchEvent(new CustomEvent("chatUnreadClear"));
        setTimeout(() => window.dispatchEvent(new CustomEvent("chatUnreadInvalidate")), 350);
      } catch {
        // ignore
      }
    };
    const t = setTimeout(setReadState, 250);
    return () => clearTimeout(t);
  }, [chatId, step]);

  // وقتی از صفحه چت خارج می‌شوی، یک بار وضعیت اعلان را از سرور بگیر
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent("chatUnreadInvalidate"));
    };
  }, []);

  const createChat = useCallback(
    async (info: { name: string; phone: string; email?: string }, opts?: { silent?: boolean }) => {
      const name = info.name?.trim();
      const phone = info.phone?.trim();
      const email = info.email?.trim();

      if (!name || !phone) {
        if (!opts?.silent) {
          toast({
            title: "خطا",
            description: "لطفاً نام و شماره تماس را وارد کنید",
            variant: "destructive",
          });
        }
        return null;
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            customerInfo: { name, phone, email: email || undefined },
            messages: [],
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          const msg =
            data?.error ||
            (response.status === 429 ? "درخواست‌های شما زیاد است. لطفاً کمی بعد دوباره تلاش کنید." : null) ||
            "خطا در ایجاد چت";
          throw new Error(msg);
        }

        const newChatId = data.data?.id;
        if (!newChatId) throw new Error("خطا در ایجاد چت");

        setChatId(newChatId);
        try {
          window.localStorage.setItem("quickBuyChat_chatId", newChatId);
        } catch {
          // ignore
        }
        setStep("chat");
        // Fetch messages for the chat (new chat will be empty)
        pollForNewMessages(newChatId);

        return newChatId as string;
      } catch (error) {
        logger.error("Error creating chat:", error);
        if (!opts?.silent) {
          toast({
            title: "خطا",
            description: error instanceof Error ? error.message : "خطا در ایجاد چت. لطفاً دوباره تلاش کنید.",
            variant: "destructive",
          });
        }
        return null;
      }
    },
    [toast, pollForNewMessages]
  );

  // Handle submit info (manual)
  const handleSubmitInfo = useCallback(async () => {
    // Chat is session-based; just ensure we have a chatId for the current user
    await initMyChat({ silent: false });
  }, [initMyChat]);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      setShowPermissionGuide(true);
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      recordingIntervalRef.current = interval;
    } catch (error) {
      logger.error("Error starting recording:", error);
      toast({
        title: "خطا",
        description: "خطا در شروع ضبط صدا",
        variant: "destructive",
      });
    }
  }, [checkMicrophonePermission, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    stopRecording();
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
  }, [stopRecording]);

  // Save recording
  const saveRecording = useCallback(async () => {
    logger.info("saveRecording called", { hasAudioBlob: !!audioBlob, hasAudioUrl: !!audioUrl });

    if (!audioBlob || !audioUrl) {
      logger.warn("No audio blob or URL available");
      toast({
        title: "خطا",
        description: "هیچ ضبط صوتی موجود نیست",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("type", "audio");

      const response = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) throw new Error("خطا در آپلود فایل");

      const data = await response.json();
      if (data.success && data.data?.url) {
        // Generate truly unique ID
        const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now()}`;
        
        const attachment: Attachment = {
          id: uniqueId,
          type: "audio",
          url: data.data.url,
          name: "پیام صوتی",
          duration: recordingTime,
        };
        setAttachments((prev) => {
          const exists = prev.some((att) => att.id === attachment.id);
          if (exists) return prev;
          return [...prev, attachment];
        });
        setAudioUrl(null);
        setAudioBlob(null);
        setRecordingTime(0);
        shouldAutoSendRef.current = true;
      } else {
        logger.warn("Voice upload failed:", data);
      }
    } catch (error) {
      logger.error("Error saving recording:", error);
      toast({
        title: "خطا",
        description: "خطا در ذخیره پیام صوتی",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [audioBlob, audioUrl, recordingTime, toast]);

  // Handle file select
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", type);

          // Add userId header if user is available (fallback for session issues)
          const headers: Record<string, string> = {};
          if (user?.id) {
            headers['x-user-id'] = user.id;
          }

          const response = await fetch("/api/chat/upload", {
            method: "POST",
            credentials: "include", // CRITICAL: Include cookies for session
            headers,
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || errorData?.message || "خطا در آپلود فایل";
            throw new Error(errorMessage);
          }

          const data = await response.json();
          if (data.success && data.data?.url) {
            const attachment: Attachment = {
              id: `${type}-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              type,
              url: data.data.url,
              name: file.name,
              size: file.size,
            };
            setAttachments((prev) => [...prev, attachment]);
          }
        }
      } catch (error) {
        logger.error("Error uploading file:", error);
        toast({
          title: "خطا",
          description: "خطا در آپلود فایل",
          variant: "destructive",
        });
      }

      // Reset input
      if (e.target) e.target.value = "";
    },
    [toast, router]
  );

  // Handle location share
  const handleLocationShare = useCallback(() => {
    logger.info("handleLocationShare called");

    if (!navigator.geolocation) {
      logger.warn("Geolocation not supported");
      toast({
        title: "خطا",
        description: "مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند",
        variant: "destructive",
      });
      return;
    }

    const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isSecure) {
      logger.warn("Not on secure origin");
      toast({
        title: "خطا",
        description: "برای استفاده از موقعیت‌یابی باید از HTTPS استفاده کنید. لطفاً از آدرس امن سایت استفاده کنید.",
        variant: "destructive",
      });
      return;
    }

    // Show loading toast
    toast({
      title: "در حال دریافت موقعیت...",
      description: "لطفاً اجازه دسترسی به موقعیت را در مرورگر بدهید",
      duration: 3000,
    });

    logger.info("Requesting geolocation permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        logger.info("Location received:", position.coords);
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const attachment: Attachment = {
          id: `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "location",
          url,
          name: "موقعیت من",
        };
        setAttachments((prev) => [...prev, attachment]);
        setShowAttachmentOptions(false);
        shouldAutoSendRef.current = true;
      },
      (error) => {
        logger.error("Error getting location:", error);
        let errorMessage = "خطا در دریافت موقعیت";
        if (error.code === 1) {
          errorMessage = "دسترسی به موقعیت رد شد. لطفاً در تنظیمات مرورگر اجازه دسترسی به موقعیت را فعال کنید.";
        } else if (error.code === 2) {
          errorMessage = "موقعیت در دسترس نیست. لطفاً مطمئن شوید که GPS فعال است.";
        } else if (error.code === 3) {
          errorMessage = "دریافت موقعیت زمان‌بر شد. لطفاً دوباره تلاش کنید.";
        }
        toast({
          title: "خطا",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [toast]);

  // Remove attachment
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  // Send typing status
  const sendTypingStatus = useCallback(
    async (isTyping: boolean) => {
      if (!chatId) return;

      try {
        await fetch("/api/chat/typing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            chatId,
            sender: "user",
            isTyping,
          }),
        });
      } catch (error) {
        // Silent fail
      }
    },
    [chatId]
  );

  // Update customer info when auth state changes
  useEffect(() => {
    // ProtectedRoute ensures user exists, so we can safely use it
    if (!user) return;

    const nextInfo = {
      name: user.name || "",
      phone: user.phone || "",
      email: "",
    };
    setCustomerInfo(nextInfo);

    // ChatId is initialized server-side via /api/chat/my
  }, [user]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    // ProtectedRoute ensures user exists, so we can safely use it
    // Server will verify session in API routes
    if (!user) {
      // This shouldn't happen if ProtectedRoute is working correctly
      toast({
        title: "خطا",
        description: "برای ارسال پیام باید وارد حساب کاربری خود شوید",
        variant: "destructive",
      });
      router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    
    let activeChatId = chatId;
    if (!activeChatId) {
      const created = await initMyChat({ silent: true });
      if (!created) {
        toast({
          title: "خطا",
          description: "چت آماده نیست. لطفاً دوباره تلاش کنید",
          variant: "destructive",
        });
        return;
      }
      activeChatId = created;
    }

    // IMPORTANT: Read from textarea ref first (IME/composition can make React state lag behind)
    const currentText = (textareaRef.current?.value ?? message) as string;
    if (!currentText.trim() && attachments.length === 0) return;

    // Use authenticated user info directly (no need for customerInfo step)
    if (!user || !user.name || !user.phone) {
      toast({
        title: "خطا",
        description: "اطلاعات کاربری کامل نیست. لطفاً دوباره وارد شوید",
        variant: "destructive",
      });
      router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }

    // If editing, update the message
    if (editingMessage) {
      try {
        const response = await fetch(`/api/chat/message/${editingMessage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            text: currentText,
            attachments: attachments,
          }),
        });

        if (response.ok) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === editingMessage.id
                ? { ...msg, text: currentText, attachments: attachments }
                : msg
            )
          );
          setEditingMessage(null);
          setMessage("");
          setAttachments([]);
        }
      } catch (error) {
        logger.error("Error editing message:", error);
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      text: message,
      sender: "user",
      timestamp: new Date(),
      attachments: attachments,
      status: "sending",
    };

    // Save message text before clearing
    const messageText = currentText;
    
    // Optimistic update: Add message to UI immediately for better UX
    setMessages((prev) => [...prev, newMessage]);
    
    // Clear input and attachments smoothly (no flash)
    setMessage("");
    setAttachments([]);
    setReplyingTo(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingStatus(false);

    try {
      // Prepare message for API - use saved messageText instead of cleared message
      const messageToSave = {
        id: tempId,
        text: messageText,
        sender: "user",
        timestamp: newMessage.timestamp.toISOString(),
        attachments: attachments.filter((att) => {
          const url = att.url;
          return url && 
                 !url.startsWith('blob:') && 
                 !url.startsWith('data:') &&
                 (url.startsWith('http') || url.startsWith('/'));
        }),
        status: "sent",
      };

      // Use authenticated user info directly (guaranteed to exist from checks above)
      const finalCustomerInfo = {
        name: user.name || "",
        phone: user.phone || "",
        email: customerInfo.email || "",
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(process.env.NODE_ENV === 'development' && user?.id ? { 'x-user-id': user.id } : {}),
        },
        credentials: "include", // CRITICAL: Include cookies for session
        body: JSON.stringify({
          chatId: activeChatId,
          customerInfo: finalCustomerInfo,
          messages: [messageToSave],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        
        // If 401 (Unauthorized), session is invalid - redirect to login
        // Server has verified that session is invalid, so we trust it
        if (response.status === 401) {
          toast({
            title: "خطا",
            description: "جلسه شما منقضی شده است. لطفاً دوباره وارد شوید",
            variant: "destructive",
          });
          router.push("/auth?redirect=" + encodeURIComponent(window.location.pathname));
          return;
        }
        const serverMsg =
          (typeof errorData?.error === "string" && errorData.error) ||
          (typeof errorData?.error?.message === "string" && errorData.error.message) ||
          (typeof errorData?.message === "string" && errorData.message) ||
          (response.status === 429 ? "درخواست‌های شما زیاد است. لطفاً کمی بعد دوباره تلاش کنید." : null) ||
          `خطا در ارسال پیام (HTTP ${response.status})`;
        throw new Error(serverMsg);
      }

      const data = await response.json();
      if (data.success && data.data?.messages && data.data.messages.length > 0) {
        const savedMessage = data.data.messages[0];
        
        // Update tempId message with real ID from server smoothly (no flash)
        // Use requestAnimationFrame to ensure smooth UI updates
        requestAnimationFrame(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    id: savedMessage.id,
                    text: savedMessage.text || msg.text, // Ensure text is preserved
                    status: savedMessage.status || "sent",
                    attachments: savedMessage.attachments || msg.attachments,
                  }
                : msg
            )
          );
        });
        
        // Update chatId if server returned a new one (stale local state)
        if (data.data.chatId && data.data.chatId !== activeChatId) {
          const nextId = data.data.chatId;
          setChatId(nextId);
          try {
            window.localStorage.setItem("quickBuyChat_chatId", nextId);
          } catch {
            // ignore
          }
        }

        // به‌روزرسانی read-state بعد از ارسال تا اعلان درست بماند
        try {
          await fetch("/api/chat/read-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ chatId: activeChatId }),
          });
        } catch {
          // ignore
        }
        window.dispatchEvent(new CustomEvent("chatUnreadClear"));
      }

      // Poll for new messages in background (silent, no visible reload)
      // Use a longer delay to avoid visible refresh
      setTimeout(() => {
        pollForNewMessages(activeChatId);
      }, 1000);
    } catch (error) {
      logger.error("Error sending message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در ارسال پیام",
        variant: "destructive",
      });
    }

    setTimeout(() => {
      scrollToBottom(false);
    }, 100);
  }, [chatId, attachments, replyingTo, editingMessage, sendTypingStatus, toast, setStep, initMyChat, pollForNewMessages, isAuthenticated, user, router]);

  // Auto-send when attachments are added (for location and voice)
  // Use a ref to track if we should auto-send (set by saveRecording/handleLocationShare)
  useEffect(() => {
    // Only auto-send if flag is set and we have attachments
    if (shouldAutoSendRef.current && attachments.length > 0) {
      shouldAutoSendRef.current = false; // Reset flag
      const timer = setTimeout(() => {
        handleSendMessage();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [attachments, handleSendMessage]);

  // Handle reply
  const handleReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
    setEditingMessage(null);
  }, []);

  // Handle edit
  const handleEdit = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setReplyingTo(null);
    setMessage(msg.text || "");
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        const response = await fetch(`/api/chat/message/${messageId}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
          // Force immediate polling to sync with other clients
          setTimeout(() => {
            pollForNewMessages();
          }, 500);
          toast({
            title: "موفق",
            description: "پیام با موفقیت حذف شد",
          });
        } else {
          const errorMessage = data.error || data.message || `خطا در حذف پیام (${response.status})`;
          toast({
            title: "خطا",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } catch (error) {
        logger.error("Error deleting message:", error);
        toast({
          title: "خطا",
          description: "خطا در حذف پیام",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Scroll to bottom
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "end",
      });
    }
  }, []);

  // Check scroll position
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) {
      setShowScrollToBottom(false);
      return;
    }
    const container = messagesContainerRef.current;
    const threshold = 150;
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottom(scrollBottom > threshold);
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    if (messages.length > 0 && step === "chat") {
      setTimeout(() => {
        scrollToBottom(true);
        checkScrollPosition();
      }, 100);
    }
  }, [messages.length, step, scrollToBottom, checkScrollPosition]);

  // Track scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkScrollPosition();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkScrollPosition]);

  // Request notification permission
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Set body and html overflow for chat page
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  return (
    <div className="chat-page-layout flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <div className="flex-1 flex justify-center w-full min-h-0">
        <main className="chat-page-main flex flex-col min-h-0 overflow-hidden w-full min-w-0 h-full mx-auto">
        {/* Header - Sticky at top */}
        <div className="flex-shrink-0 border-b border-border/40 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-8 w-8 rounded-lg"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
                پشتیبانی و خرید سریع
                {step === "chat" && (
                  <OnlineStatusBadge isOnline={isOnline} lastSeen={lastSeen instanceof Date ? lastSeen.toISOString() : (typeof lastSeen === "string" ? lastSeen : null)} showText={false} />
                )}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {step === "info" ? (
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-gradient-to-b from-background via-background to-muted/10">
              {/* Welcome Message */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pb-2"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-3 shadow-lg">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  لطفاً اطلاعات زیر را برای شروع خرید سریع وارد کنید
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="7"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    نام و نام خانوادگی
                    <span className="text-destructive text-xs">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="مثال: علی احمدی"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    className="h-12 text-base border-2 border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all bg-background/50 hover:bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    شماره تماس
                    <span className="text-destructive text-xs">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="09123456789"
                    value={customerInfo.phone}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, phone: e.target.value })
                    }
                    className="h-12 text-base border-2 border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all bg-background/50 hover:bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    ایمیل
                    <span className="text-xs text-muted-foreground font-normal">(اختیاری)</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="example@email.com"
                    value={customerInfo.email}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, email: e.target.value })
                    }
                    className="h-12 text-base border-2 border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 rounded-xl transition-all bg-background/50 hover:bg-background"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="pt-2"
              >
                <Button
                  onClick={handleSubmitInfo}
                  disabled={!customerInfo.name || !customerInfo.phone}
                  className="w-full h-13 text-base font-semibold bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed rounded-xl"
                >
                  <span className="flex items-center justify-center gap-2">
                    ادامه
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                    >
                      →
                    </motion.div>
                  </span>
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  با ادامه، شما شرایط و قوانین ما را می‌پذیرید
                </p>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 bg-gradient-to-b from-background via-background/95 to-muted/5 scroll-smooth"
              >
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 shadow-lg">
                      <MessageCircle className="h-10 w-10 text-primary/60" />
                    </div>
                    <p className="text-muted-foreground text-base font-medium leading-relaxed">
                      هنوز پیامی ارسال نشده است
                    </p>
                    <p className="text-muted-foreground/70 text-sm mt-2 leading-relaxed">
                      پیام خود را بنویسید...
                    </p>
                  </motion.div>
                )}
                <div className="space-y-3">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} items-end gap-2 group`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-lg px-2.5 sm:px-3 py-2 transition-all ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground border border-border/40"
                      }`}
                    >
                      {msg.text && (
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words mb-1.5">
                          {msg.text}
                        </p>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={`space-y-2 ${msg.text ? "mt-2" : ""}`}>
                          {msg.attachments.map((attachment) => (
                            <div key={attachment.id} className="rounded-xl overflow-hidden">
                              {attachment.type === "image" && attachment.url && (
                                <img
                                  src={attachment.url}
                                  alt={attachment.name || "تصویر"}
                                  className="max-w-full max-h-[150px] sm:max-h-[180px] rounded cursor-pointer hover:opacity-90 transition-all"
                                  onClick={() => window.open(attachment.url, "_blank")}
                                />
                              )}
                              {attachment.type === "file" && (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={attachment.name}
                                  className="flex items-center gap-2 p-2 bg-background/50 rounded hover:bg-background/70 transition-all text-xs"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span className="font-medium truncate">{attachment.name || "فایل"}</span>
                                </a>
                              )}
                              {attachment.type === "location" && (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-background/50 rounded hover:bg-background/70 transition-all text-xs"
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span className="font-medium">{attachment.name || "موقعیت"}</span>
                                </a>
                              )}
                              {attachment.type === "audio" && attachment.url && (
                                <AudioPlayer url={attachment.url} duration={attachment.duration} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-1.5 mt-1.5 pt-1.5 border-t ${
                          msg.sender === "user"
                            ? "border-primary-foreground/20 justify-end"
                            : "border-border/30 justify-start"
                        }`}
                      >
                        <span
                          className={`text-[10px] sm:text-xs ${
                            msg.sender === "user"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString("fa-IR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.sender === "user" && (
                          <>
                            {msg.status === "sending" && (
                              <Loader2 className="h-3 w-3 text-primary-foreground/50 animate-spin" />
                            )}
                            {msg.status === "sent" && (
                              <Check className="h-3 w-3 text-primary-foreground/40" />
                            )}
                            {msg.status === "delivered" && (
                              <CheckCheck className="h-3 w-3 text-primary-foreground/40" />
                            )}
                            {msg.status === "read" && (
                              <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                            )}
                            {!msg.status && (
                              <Check className="h-3 w-3 text-primary-foreground/40" />
                            )}
                          </>
                        )}
                        {/* آیکون حذف مستقیم فقط برای پیام‌های ارسالی کاربر - همیشه قابل مشاهده */}
                        {msg.sender === "user" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10 text-destructive hover:text-destructive opacity-70 hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("آیا مطمئن هستید که می‌خواهید این پیام را حذف کنید؟")) {
                                handleDelete(msg.id);
                              }
                            }}
                            title="حذف پیام"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isSupportTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start items-end gap-2.5"
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area - Fixed at bottom */}
              <div className="flex-shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm p-2 sm:p-3 space-y-2 relative">
                {/* Scroll to bottom button */}
                <AnimatePresence>
                  {showScrollToBottom && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10"
                    >
                      <Button
                        onClick={() => scrollToBottom(false)}
                        size="icon"
                        className="h-9 w-9 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                        title="برو به آخرین پیام"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Recording UI */}
                {(isRecording || audioUrl) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg"
                  >
                    {isRecording ? (
                      <>
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="p-1.5 rounded-full bg-destructive/20"
                        >
                          <Mic className="h-3.5 w-3.5 text-destructive" />
                        </motion.div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-destructive leading-tight">در حال ضبط</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatTime(recordingTime)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={stopRecording}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Square className="h-3 w-3 fill-current" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="p-1.5 rounded-full bg-primary/20">
                          <Mic className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium leading-tight">پیام صوتی آماده است</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatTime(recordingTime)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelRecording}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            saveRecording();
                          }} 
                          size="sm" 
                          className="h-7 px-3 text-xs rounded-lg"
                          title="ذخیره و ارسال پیام صوتی"
                        >
                          ذخیره
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}

                {/* Attachment Options */}
                {showAttachmentOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="flex gap-2 p-2 bg-card rounded-lg border border-border/50 shadow-lg"
                    onClick={() => {}}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        imageInputRef.current?.click();
                        setShowAttachmentOptions(false);
                      }}
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                    >
                      <Image className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachmentOptions(false);
                      }}
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLocationShare();
                        setShowAttachmentOptions(false);
                      }}
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                      title="اشتراک‌گذاری موقعیت مکانی"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                        onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAttachmentOptions(false);
                        if (isRecording) {
                          stopRecording();
                        } else {
                          // Show loading toast
                          toast({
                            title: "در حال درخواست دسترسی...",
                            description: "لطفاً اجازه دسترسی به میکروفون را در مرورگر بدهید",
                            duration: 3000,
                          });
                          
                          const hasPermission = await checkMicrophonePermission();
                          if (!hasPermission) {
                            toast({
                              title: "نیاز به دسترسی میکروفون",
                              description: "برای ضبط صدا، لطفاً دسترسی میکروفون را در تنظیمات مرورگر فعال کنید.",
                              variant: "destructive",
                              duration: 5000,
                            });
                            return;
                          }
                          startRecording();
                        }
                      }}
                      title="ضبط پیام صوتی"
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                      disabled={isRecording}
                    >
                      {isRecording ? (
                        <Pause className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* Hidden Inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "image")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "file")}
                />

                {/* Input */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div className="absolute top-2 right-2 left-2 z-10 pointer-events-none overflow-hidden">
                        <div className="overflow-x-auto overflow-y-hidden scroll-smooth w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            {attachments.map((attachment) => (
                              <div
                                key={attachment.id}
                                className="relative group pointer-events-auto flex-shrink-0 w-auto"
                              >
                                <div className="bg-card/95 backdrop-blur-sm rounded-md p-1 border border-border/40 shadow-sm">
                                  {attachment.type === "image" && attachment.url && (
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name || "تصویر"}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  )}
                                  {attachment.type === "file" && (
                                    <div className="flex items-center gap-1 px-1.5 py-1">
                                      <FileText className="h-3 w-3 flex-shrink-0 text-primary" />
                                      <p className="text-[10px] truncate max-w-[50px] font-medium leading-tight">
                                        {attachment.name}
                                      </p>
                                    </div>
                                  )}
                                  {attachment.type === "location" && (
                                    <div className="flex items-center gap-1 px-1.5 py-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0 text-primary" />
                                      <span className="text-[10px] font-medium whitespace-nowrap leading-tight">
                                        موقعیت
                                      </span>
                                    </div>
                                  )}
                                  {attachment.type === "audio" && (
                                    <div className="flex items-center gap-1 px-1.5 py-1">
                                      <Mic className="h-3 w-3 flex-shrink-0 text-primary" />
                                      <span className="text-[10px] font-medium whitespace-nowrap leading-tight">
                                        {attachment.duration ? formatTime(attachment.duration) : "صدا"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRemoveAttachment(attachment.id)}
                                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20 hover:scale-110"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <Textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current);
                        }
                        if (e.target.value.trim().length > 0) {
                          sendTypingStatus(true);
                          typingTimeoutRef.current = setTimeout(() => {
                            sendTypingStatus(false);
                          }, 2000);
                        } else {
                          sendTypingStatus(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                          }
                          sendTypingStatus(false);
                          handleSendMessage();
                        }
                      }}
                      placeholder="پیام خود را بنویسید..."
                      className={`min-h-[44px] max-h-[100px] resize-none text-sm leading-relaxed rounded-lg border pr-20 pl-3 py-2 ${
                        attachments.length > 0 ? "pt-12" : ""
                      }`}
                    />

                    {/* Buttons */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAttachmentOptions(!showAttachmentOptions);
                        }}
                        className={`h-7 w-7 rounded-lg transition-all ${
                          showAttachmentOptions
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      {!isRecording && (
                        <>
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          ) : (
                            <Button
                              onClick={handleSendMessage}
                              size="icon"
                              className="h-7 w-7 rounded-lg transition-all"
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </main>
      </div>
    </div>
  );
}

export default function ChatPage() {
  // Chat requires authentication - only registered users can chat
  return (
    <ProtectedRoute requireAuth>
      <ChatPageContent />
    </ProtectedRoute>
  );
}

