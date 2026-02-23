"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Search,
  User,
  Phone,
  Mail,
  X,
  Loader2,
  ChevronDown,
  Send,
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAdminPresence } from "@/hooks/use-admin-presence";
import { OnlineStatusBadge } from "@/components/chat/online-status-badge";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Badge } from "@/components/ui/badge";
import { useChatUtils } from "@/hooks/use-chat-utils";
import { useChatMessaging, type Message } from "@/hooks/use-chat-messaging";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { logger } from "@/lib/logger-client";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";

interface Chat {
  id: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isRegisteredUser?: boolean; // Flag for registered users without chat
  isUserWithoutChat?: boolean; // Alternative flag name from API
}

interface AdminChatProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomerPhone?: string;
}

export function AdminChat({ isOpen, onOpenChange, initialCustomerPhone }: AdminChatProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const getAdminChatHeaders = useCallback((contentType = true): HeadersInit => {
    const h: Record<string, string> = {};
    if (contentType) h["Content-Type"] = "application/json";
    if (typeof window !== "undefined") {
      const adminToken = window.sessionStorage.getItem("adminToken");
      const adminUserId = window.sessionStorage.getItem("adminUserId");
      if (adminToken) h["Authorization"] = `Bearer ${adminToken}`;
      if (adminUserId) h["x-user-id"] = adminUserId;
    }
    return h;
  }, []);

  const { setOnline, isOnline } = useAdminPresence({
    enabled: true,
    heartbeatInterval: 15000,
  });
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const typingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isSavingRecordingRef = useRef(false);

  // Use shared hooks
  const chatUtils = useChatUtils();
  const chatMessaging = useChatMessaging({
    chatId: selectedChat?.id || null,
    sender: "support",
    customerInfo: selectedChat ? {
      name: selectedChat.customerName,
      phone: selectedChat.customerPhone,
      email: selectedChat.customerEmail,
    } : undefined,
    onMessageSent: () => {
      // Silent refresh - no loading state
      // Delay to avoid conflict with immediate message addition in handleSend
      // Only refresh chats list, don't reload messages (handleSend already adds message to UI)
      setTimeout(() => {
        loadChats(false);
        // Don't reload messages here - handleSend already adds the message to UI
        // This prevents duplicate messages and state conflicts
      }, 2000); // Longer delay to let handleSend finish completely
    },
  });

  // Load chats list - includes all registered users
  const loadChats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoadingChats(true);
      const headers: HeadersInit = getAdminChatHeaders();
      const response = await fetch("/api/chat", { credentials: "include", headers });
      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[AdminChat] Failed to load chats:", response.status, errorText);
        throw new Error("خطا در بارگذاری چت‌ها");
      }
      
      const data = await response.json();
      if (data.success && data.data?.chats && Array.isArray(data.data.chats)) {
        const chatsWithLastMessage = await Promise.all(
          data.data.chats.map(async (chat: Chat) => {
            // If it's a registered user without chat, skip loading messages
            if (chat.isRegisteredUser || chat.isUserWithoutChat) {
              return {
                ...chat,
                lastMessage: "هنوز پیامی ارسال نشده است",
                lastMessageTime: chat.updatedAt || chat.createdAt,
                unreadCount: undefined,
                isRegisteredUser: true, // Normalize flag
              };
            }
            
            try {
              const msgResponse = await fetch(`/api/chat?chatId=${chat.id}`, { credentials: "include", headers: getAdminChatHeaders(false) });
              if (msgResponse.ok) {
                const msgData = await msgResponse.json();
                if (msgData.success && msgData.data.messages) {
                  const msgs = msgData.data.messages;
                  const lastMsg = msgs[msgs.length - 1];
                  const unreadCount = chat.unreadCount && chat.unreadCount > 0 ? chat.unreadCount : undefined;
                  return {
                    ...chat,
                    lastMessage: lastMsg?.text || "",
                    lastMessageTime: lastMsg?.createdAt || chat.updatedAt,
                    unreadCount: unreadCount,
                  };
                }
              }
            } catch (error) {
              logger.error("Error loading last message:", error);
            }
            const unreadCount = chat.unreadCount && chat.unreadCount > 0 ? chat.unreadCount : undefined;
            return { ...chat, unreadCount: unreadCount };
          })
        );
        setChats(chatsWithLastMessage);
        if (chatsWithLastMessage.length === 0) {
          useNotificationStore.getState().clearAdminChatNotifications();
          try {
            sessionStorage.setItem("admin_chat_list_empty_at", String(Date.now()));
          } catch {
            // ignore
          }
        } else {
          try {
            sessionStorage.removeItem("admin_chat_list_empty_at");
          } catch {
            // ignore
          }
        }
      } else {
        setChats([]);
        useNotificationStore.getState().clearAdminChatNotifications();
        try {
          sessionStorage.setItem("admin_chat_list_empty_at", String(Date.now()));
        } catch {
          // ignore
        }
      }
    } catch (error) {
      logger.error("[AdminChat] Error loading chats:", error);
      if (showLoading) {
        toast({
          title: "خطا",
          description: "خطا در بارگذاری چت‌ها",
          variant: "destructive",
        });
      }
      setChats([]);
    } finally {
      if (showLoading) setIsLoadingChats(false);
    }
  }, [toast, getAdminChatHeaders]);

  // Load messages
  const loadMessages = useCallback(async (chatId: string, isInitial = false) => {
    try {
      if (isInitial) setIsLoadingMessages(true);
      
      let url = `/api/chat?chatId=${chatId}`;
      // Only add lastMessageId if it exists and is not a temporary ID
      if (!isInitial && lastMessageIdRef.current && !lastMessageIdRef.current.startsWith('temp-')) {
        url += `&lastMessageId=${lastMessageIdRef.current}`;
      }
      
      const response = await fetch(url, { credentials: "include", headers: getAdminChatHeaders(false) });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 404) {
          useNotificationStore.getState().dismissNotification(`chat-admin-${chatId}`);
          setSelectedChat(null);
          setChats((prev) => prev.filter((c) => c.id !== chatId));
          toast({
            title: "چت یافت نشد",
            description: "این چت وجود ندارد یا حذف شده است.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data?.error || "خطا در بارگذاری پیام‌ها");
      }
      
      if (!data) throw new Error("خطا در بارگذاری پیام‌ها");
      if (data.success && data.data.messages) {
        const formattedMessages: Message[] = data.data.messages.map((msg: any) => {
          let attachments: any[] = [];
          if (msg.attachments) {
            if (Array.isArray(msg.attachments)) {
              attachments = msg.attachments;
            } else if (typeof msg.attachments === 'string') {
              try {
                const parsed = JSON.parse(msg.attachments);
                attachments = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                logger.error("Error parsing attachments:", e);
              }
            }
          }
          
          return {
            id: msg.id,
            text: msg.text || "",
            sender: msg.sender as "user" | "support",
            timestamp: new Date(msg.createdAt),
            attachments: attachments,
            status: msg.status || (msg.sender === "user" ? "sent" : undefined),
          };
        });
        
        if (selectedChat) {
          try {
            const unreadResponse = await fetch(`/api/chat/unread-count?chatId=${selectedChat.id}`, { credentials: "include", headers: getAdminChatHeaders(false) });
            if (unreadResponse.ok) {
              const unreadData = await unreadResponse.json();
              if (unreadData.success && unreadData.data) {
                const unreadCount = unreadData.data.unreadCount && unreadData.data.unreadCount > 0 
                  ? unreadData.data.unreadCount 
                  : undefined;
                setChats((prevChats) =>
                  prevChats.map((c) =>
                    c.id === selectedChat.id ? { ...c, unreadCount } : c
                  )
                );
              }
            }
          } catch (error) {
            // Silent fail
          }
        }
        
        if (isInitial) {
          setMessages(formattedMessages);
          if (formattedMessages.length > 0) {
            const lastMsg = formattedMessages[formattedMessages.length - 1];
            // Only set lastMessageId if it's not a temporary ID
            if (lastMsg.id && !lastMsg.id.startsWith('temp-')) {
              lastMessageIdRef.current = lastMsg.id;
            }
          }
        } else {
          setMessages((prev) => {
            // Only update if we have messages from DB (avoid clearing on empty response during polling)
            if (formattedMessages.length === 0 && prev.length > 0) {
              return prev; // Keep existing messages if DB returns empty (might be polling issue)
            }
            
            const dbMessageIds = new Set(formattedMessages.map((m) => m.id));
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = formattedMessages.filter((msg) => !existingIds.has(msg.id));
            
            // Remove messages that were deleted from database (but keep temp messages)
            const filteredPrev = prev.filter((msg) => 
              msg.id.startsWith("temp-") || dbMessageIds.has(msg.id)
            );
            
            // Update status of existing messages
            const updatedPrev = filteredPrev.map((msg) => {
              const dbMsg = formattedMessages.find((m) => m.id === msg.id);
              if (dbMsg && msg.sender === "user" && dbMsg.status && msg.status !== dbMsg.status) {
                return { ...msg, status: dbMsg.status };
              }
              return msg;
            });
            
            if (newMessages.length > 0) {
              const lastMsg = newMessages[newMessages.length - 1];
              // Only set lastMessageId if it's not a temporary ID
              if (lastMsg.id && !lastMsg.id.startsWith('temp-')) {
                lastMessageIdRef.current = lastMsg.id;
              }
              return [...updatedPrev, ...newMessages];
            }
            // Only update if we actually removed deleted messages or updated status
            const hasChanges = filteredPrev.length !== prev.length || 
              updatedPrev.some((msg, idx) => {
                const origMsg = prev.find((m) => m.id === msg.id);
                return !origMsg || origMsg.status !== msg.status;
              });
            if (hasChanges) {
              return updatedPrev;
            }
            return prev; // No changes, return previous state to avoid unnecessary re-render
          });
        }
      } else if (data.success && selectedChat?.isRegisteredUser) {
        // For registered users without chat, start with empty messages
        setMessages([]);
      }
    } catch (error) {
      logger.error("Error loading messages:", error);
      if (isInitial) {
        toast({
          title: "خطا",
          description: "خطا در بارگذاری پیام‌ها",
          variant: "destructive",
        });
      }
    } finally {
      if (isInitial) setIsLoadingMessages(false);
    }
  }, [selectedChat, toast]);

  // Mark messages as delivered/read
  const markUserMessagesAsDelivered = useCallback(async (chatId: string) => {
    try {
      await fetch("/api/chat/status", {
        method: "POST",
        headers: getAdminChatHeaders(),
        credentials: "include",
        body: JSON.stringify({ chatId, sender: "support", action: "delivered" }),
      });
    } catch (error) {
      // Silent fail
    }
  }, []);

  const markUserMessagesAsRead = useCallback(async (chatId: string) => {
    try {
      await fetch("/api/chat/status", {
        method: "POST",
        headers: getAdminChatHeaders(),
        credentials: "include",
        body: JSON.stringify({ chatId, sender: "support", action: "read" }),
      });
    } catch (error) {
      // Silent fail
    }
  }, []);

  // به‌روزرسانی read-state ادمین وقتی چت انتخاب می‌شود (سیستم اعلان)
  const setAdminReadState = useCallback(async (chatId: string) => {
    try {
      await fetch("/api/chat/read-state", {
        method: "POST",
        headers: getAdminChatHeaders(),
        credentials: "include",
        body: JSON.stringify({ chatId }),
      });
    } catch (error) {
      // Silent fail
    }
  }, []);

  // Handle chat selection
  const handleSelectChat = useCallback(async (chat: Chat) => {
    // Reset state before selecting new chat to prevent flickering
    setMessages([]);
    lastMessageIdRef.current = null;
    setSelectedChat(chat);
    
    if (typeof window !== "undefined") {
      localStorage.setItem('admin_selected_chat_id', chat.id);
      window.dispatchEvent(new CustomEvent('chatOpened', { detail: { chatId: chat.id } }));
      window.dispatchEvent(new CustomEvent('adminChatUnreadInvalidate'));
    }
    
    // If it's a registered user without chat, create chat on first message
    if ((chat.isRegisteredUser || chat.isUserWithoutChat) && chat.userId) {
      setMessages([]);
    } else {
      setAdminReadState(chat.id).catch(() => {});
      markUserMessagesAsRead(chat.id).catch(() => {});
      markUserMessagesAsDelivered(chat.id);
      loadMessages(chat.id, true);
    }
    
    setChats((prevChats) =>
      prevChats.map((c) =>
        c.id === chat.id ? { ...c, unreadCount: undefined } : c
      )
    );
  }, [loadMessages, markUserMessagesAsRead, markUserMessagesAsDelivered, setAdminReadState]);

  // Check typing status
  const checkUserTyping = useCallback(async () => {
    if (!selectedChat || selectedChat.isRegisteredUser || selectedChat.isUserWithoutChat) return;
    try {
      const response = await fetch(`/api/chat/typing?chatId=${selectedChat.id}&sender=user`, { credentials: "include", headers: getAdminChatHeaders(false) });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsUserTyping(data.data.isTyping || false);
        }
      }
    } catch (error) {
      // Silent fail
    }
  }, [selectedChat]);

  // Handle reply
  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  }, []);

  // Handle edit
  const handleEdit = useCallback((message: Message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    chatMessaging.handleMessageChange({ target: { value: message.text || "" } } as React.ChangeEvent<HTMLTextAreaElement>);
  }, [chatMessaging]);

  // Handle delete
  const handleDelete = useCallback(async (messageId: string) => {
    if (!selectedChat) {
      logger.error("[AdminChat] handleDelete: No selected chat");
      return;
    }
    
    if (!messageId) return;
    
    try {
      const response = await fetch(`/api/chat/message/${messageId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAdminChatHeaders(),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        logger.error("[AdminChat] Failed to parse response:", text);
        data = {};
      }
      
      if (response.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
        // Refresh chats to update last message (silent - no loading)
        loadChats(false);
        // Force immediate message reload to sync with other clients (silent - no loading)
        if (selectedChat) {
          setTimeout(() => {
            loadMessages(selectedChat.id, false).catch(() => {
              // Silent fail
            });
          }, 500);
        }
        toast({
          title: "موفق",
          description: data.message || "پیام با موفقیت حذف شد",
        });
      } else {
        const errorMessage = data.error || data.message || `خطا در حذف پیام (${response.status})`;
        logger.error("[AdminChat] Delete error:", errorMessage, data);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error("[AdminChat] Delete exception:", error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در حذف پیام",
        variant: "destructive",
      });
    }
  }, [selectedChat, toast, loadChats, loadMessages]);

  // Handle block user
  const handleBlockUser = useCallback(async () => {
    if (!selectedChat) return;
    
    setIsBlocking(true);
    try {
      const response = await fetch(`/api/chat/block`, {
        method: "POST",
        headers: getAdminChatHeaders(),
        body: JSON.stringify({
          chatId: selectedChat.id,
          customerPhone: selectedChat.customerPhone,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "موفق",
          description: "کاربر با موفقیت مسدود شد",
        });
        setBlockDialogOpen(false);
        // Remove chat from list
        setChats((prev) => prev.filter((chat) => chat.id !== selectedChat.id));
        setSelectedChat(null);
        setMessages([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "خطا در مسدود کردن کاربر");
      }
    } catch (error) {
      logger.error("Error blocking user:", error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در مسدود کردن کاربر",
        variant: "destructive",
      });
    } finally {
      setIsBlocking(false);
    }
  }, [selectedChat, toast]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!selectedChat) return;
    
    // If editing, update the message instead of sending new one
    if (editingMessage) {
      try {
        const response = await fetch(`/api/chat/message/${editingMessage.id}`, {
          method: "PATCH",
          headers: getAdminChatHeaders(),
          body: JSON.stringify({
            text: chatMessaging.message,
            attachments: chatUtils.attachments,
          }),
        });
        
        if (response.ok) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === editingMessage.id
                ? { ...msg, text: chatMessaging.message, attachments: chatUtils.attachments }
                : msg
            )
          );
          setEditingMessage(null);
          chatMessaging.handleMessageChange({ target: { value: "" } } as React.ChangeEvent<HTMLTextAreaElement>);
          chatUtils.setAttachments([]);
          toast({
            title: "موفق",
            description: "پیام ویرایش شد",
          });
        }
      } catch (error) {
        logger.error("Error editing message:", error);
        toast({
          title: "خطا",
          description: "خطا در ویرایش پیام",
          variant: "destructive",
        });
      }
      return;
    }
    
    // If it's a registered user without chat, create chat first
    if ((selectedChat.isRegisteredUser || selectedChat.isUserWithoutChat) && selectedChat.userId) {
      try {
        // Create chat for this user
        const createResponse = await fetch("/api/chat", {
          method: "POST",
          headers: getAdminChatHeaders(),
          credentials: "include",
          body: JSON.stringify({
            customerInfo: {
              name: selectedChat.customerName,
              phone: selectedChat.customerPhone,
              email: selectedChat.customerEmail,
            },
            messages: [{
              text: chatMessaging.message,
              sender: "support",
              attachments: chatUtils.attachments,
            }],
          }),
        });
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          if (createData.success && createData.data.chat) {
            const newChat = createData.data.chat;
            // Update selected chat
            const updatedChat: Chat = {
              ...selectedChat,
              id: newChat.id,
              isRegisteredUser: false,
              isUserWithoutChat: false,
            };
            setSelectedChat(updatedChat);
            
            // Update UI smoothly without visible reload
            // Add the sent message to UI immediately
            if (createData.success && createData.data.messages && createData.data.messages.length > 0) {
              const sentMessage = createData.data.messages[0];
              setMessages((prev) => [...prev, sentMessage]);
            }
            
            // Reload chats and messages in background (silent)
            loadChats(false).catch(() => {});
            loadMessages(newChat.id, false).catch(() => {});
            
            // Scroll to bottom smoothly
            setTimeout(() => {
              scrollToBottom(false);
            }, 100);
            
            // Clear attachments and UI state smoothly
            chatUtils.setAttachments([]);
            chatUtils.setShowAttachmentOptions(false);
            setReplyingTo(null);
            
            toast({
              title: "موفق",
              description: "پیام ارسال شد",
            });
          }
        }
      } catch (error) {
        logger.error("Error creating chat:", error);
        toast({
          title: "خطا",
          description: "خطا در ارسال پیام",
          variant: "destructive",
        });
      }
      return;
    }
    
    const sentMessage = await chatMessaging.handleSend(chatUtils.attachments, replyingTo);
    if (sentMessage) {
      // Add message to UI smoothly (no flash/reload)
      setMessages((prev) => {
        // Check if message already exists (avoid duplicates)
        const exists = prev.some((msg) => msg.id === sentMessage.id);
        if (exists) return prev;
        return [...prev, sentMessage];
      });
      
      // Clear attachments and UI state smoothly
      chatUtils.setAttachments([]);
      chatUtils.setShowAttachmentOptions(false);
      setReplyingTo(null);
      
      // Update last message ID for polling
      if (sentMessage.id && !sentMessage.id.startsWith("temp-")) {
        lastMessageIdRef.current = sentMessage.id;
      }
      
      // Refresh chats list silently (without loading) to update last message
      // Delay to avoid conflict with message addition
      setTimeout(() => {
        loadChats(false);
      }, 500);
      
      // Scroll to bottom smoothly after sending message
      setTimeout(() => {
        scrollToBottom(false);
        setTimeout(() => {
          checkScrollPosition();
        }, 500);
      }, 100);
    }
  }, [selectedChat, chatMessaging, chatUtils, editingMessage, replyingTo, toast, loadChats, loadMessages]);

  // Check if user is scrolled up
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current || !selectedChat) {
      setShowScrollToBottom(false);
      return;
    }
    const container = messagesContainerRef.current;
    const threshold = 150;
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isScrolledUp = scrollBottom > threshold;
    setShowScrollToBottom(isScrolledUp);
  }, [selectedChat]);

  // Scroll to bottom function
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: instant ? "auto" : "smooth",
        block: "end"
      });
      setTimeout(() => {
        setShowScrollToBottom(false);
      }, 300);
    }
  }, []);

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedChat) {
      setShowScrollToBottom(false);
      return;
    }

    const handleScroll = () => {
      checkScrollPosition();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    checkScrollPosition();
    
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [selectedChat, checkScrollPosition, messages.length]);

  // Scroll to bottom when chat is selected
  const hasScrolledOnSelectRef = useRef<boolean>(false);
  useEffect(() => {
    if (selectedChat && messages.length > 0 && !hasScrolledOnSelectRef.current) {
      hasScrolledOnSelectRef.current = true;
      const timeout = setTimeout(() => {
        scrollToBottom(true);
        setTimeout(() => {
          checkScrollPosition();
        }, 500);
      }, 200);
      return () => clearTimeout(timeout);
    } else if (!selectedChat) {
      hasScrolledOnSelectRef.current = false;
    }
  }, [selectedChat, messages.length, scrollToBottom, checkScrollPosition]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedChat || !isOpen || selectedChat.isRegisteredUser || selectedChat.isUserWithoutChat) {
      setIsUserTyping(false);
      if (typingPollIntervalRef.current) {
        clearInterval(typingPollIntervalRef.current);
        typingPollIntervalRef.current = null;
      }
      return;
    }

    markUserMessagesAsDelivered(selectedChat.id);
    markUserMessagesAsRead(selectedChat.id).catch(() => {});

    checkUserTyping();
    typingPollIntervalRef.current = setInterval(() => {
      checkUserTyping();
    }, 3000);

    const interval = setInterval(() => {
      // Silent polling - no loading state
      loadMessages(selectedChat.id, false).catch(() => {
        // Silent fail for polling
      });
      markUserMessagesAsDelivered(selectedChat.id);
      markUserMessagesAsRead(selectedChat.id).catch(() => {});
    }, 5000);

    return () => {
      clearInterval(interval);
      if (typingPollIntervalRef.current) {
        clearInterval(typingPollIntervalRef.current);
        typingPollIntervalRef.current = null;
      }
    };
  }, [selectedChat, isOpen, checkUserTyping, loadMessages, markUserMessagesAsDelivered, markUserMessagesAsRead]);

  // Load chats on open
  useEffect(() => {
    if (isOpen) {
      loadChats(true);
      // اگر شماره تلفن اولیه وجود نداشت، چت را null کن
      if (!initialCustomerPhone) {
        setSelectedChat(null);
        setMessages([]);
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem('admin_selected_chat_id');
        window.dispatchEvent(new CustomEvent('chatClosed'));
      }
      setOnline(true);
      
      const chatListInterval = setInterval(() => loadChats(false), 15000);
      
      return () => {
        clearInterval(chatListInterval);
      };
    } else {
      setOnline(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem('admin_selected_chat_id');
        window.dispatchEvent(new CustomEvent('chatClosed'));
      }
    }
  }, [isOpen, setOnline, loadChats]);

  // انتخاب خودکار چت بر اساس شماره تلفن اولیه
  useEffect(() => {
    if (initialCustomerPhone && chats.length > 0 && !selectedChat) {
      const matchingChat = chats.find(
        (chat) => chat.customerPhone === initialCustomerPhone
      );
      if (matchingChat) {
        setSelectedChat(matchingChat);
        loadMessages(matchingChat.id, true);
      }
    }
  }, [initialCustomerPhone, chats, selectedChat, loadMessages]);

  const filteredChats = chats.filter((chat) =>
    chat.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.customerPhone.includes(searchQuery) ||
    chat.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If not open, return null
  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-screen w-screen fixed inset-0 z-50 bg-background flex flex-col overflow-hidden" style={{ margin: 0, padding: 0 }}>
      <div className="flex flex-1 overflow-hidden min-h-0 max-w-6xl mx-auto w-full">
          {/* Left Sidebar - Contact List */}
          <div className="w-full sm:w-64 md:w-72 border-l border-border flex flex-col bg-background min-h-0 flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="جستجوی کاربر..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (onOpenChange) {
                      onOpenChange(false);
                    } else {
                      router.push("/admin");
                    }
                  }}
                  className="h-10 w-10 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contact List */}
            <ScrollArea className="flex-1">
              {isLoadingChats ? (
                <div className="flex items-center justify-center h-full p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <MessageCircle className="h-14 w-14 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">چتی یافت نشد</p>
                  {chats.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      (تعداد کل: {chats.length} - فیلتر شده: {filteredChats.length})
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectChat(chat)}
                      className={`w-full p-4 text-right hover:bg-muted/50 transition-all ${
                        selectedChat?.id === chat.id ? "bg-primary/10 border-r-4 border-primary" : ""
                      } ${chat.unreadCount && chat.unreadCount > 0 ? "font-semibold" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm truncate">{chat.customerName}</p>
                            {chat.unreadCount && chat.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 w-5 px-0 text-xs flex items-center justify-center">
                                !
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Phone className="h-3 w-3" />
                            <span>{chat.customerPhone}</span>
                          </div>
                          {chat.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {chat.lastMessage}
                            </p>
                          )}
                          {chat.lastMessageTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(chat.lastMessageTime), "HH:mm", { locale: faIR })}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Side - Chat Area */}
          <div className="flex-1 flex flex-col border-l border-border bg-card">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedChat.customerName}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{selectedChat.customerPhone}</span>
                        {selectedChat.customerEmail && (
                          <>
                            <Mail className="h-3 w-3 mr-2" />
                            <span>{selectedChat.customerEmail}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBlockDialogOpen(true)}
                      className="flex items-center gap-2 text-destructive hover:text-destructive"
                    >
                      <Ban className="h-4 w-4" />
                      <span className="hidden sm:inline">مسدود کردن</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedChat(null);
                        setMessages([]);
                        lastMessageIdRef.current = null;
                      }}
                      className="mr-4"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea ref={messagesContainerRef} className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="h-14 w-14 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {(selectedChat.isRegisteredUser || selectedChat.isUserWithoutChat)
                          ? "هنوز پیامی ارسال نشده است. می‌توانید اولین پیام را ارسال کنید."
                          : "هنوز پیامی ارسال نشده است"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, index) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          index={index}
                          totalMessages={messages.length}
                          onReply={handleReply}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                      {isUserTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex justify-start items-end gap-2.5"
                        >
                          <TypingIndicator />
                        </motion.div>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Chat Input */}
                <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0">
                  <ChatInput
                    message={chatMessaging.message}
                    onMessageChange={chatMessaging.handleMessageChange}
                    onSend={handleSend}
                    isSending={chatMessaging.isSending}
                    attachments={chatUtils.attachments}
                    onRemoveAttachment={chatUtils.handleRemoveAttachment}
                    showAttachmentOptions={chatUtils.showAttachmentOptions}
                    onToggleAttachmentOptions={() => chatUtils.setShowAttachmentOptions(!chatUtils.showAttachmentOptions)}
                    isRecording={chatUtils.isRecording}
                    recordingTime={chatUtils.recordingTime}
                    audioUrl={chatUtils.audioUrl}
                    onStartRecording={chatUtils.startRecording}
                    onStopRecording={chatUtils.stopRecording}
                    onCancelRecording={chatUtils.cancelRecording}
                    onSaveRecording={async () => {
                      // Prevent concurrent saves
                      if (isSavingRecordingRef.current) {
                        return;
                      }
                      isSavingRecordingRef.current = true;
                      
                      try {
                        const attachment = await chatUtils.saveRecording();
                        if (attachment) {
                          // Check if attachment already exists to avoid duplicates
                          chatUtils.setAttachments((prev) => {
                            const exists = prev.some(att => att.id === attachment.id);
                            if (exists) {
                              return prev; // Already exists, don't add again
                            }
                            return [...prev, attachment];
                          });
                        }
                      } finally {
                        isSavingRecordingRef.current = false;
                      }
                    }}
                    formatTime={chatUtils.formatTime}
                    imageInputRef={chatUtils.imageInputRef}
                    fileInputRef={chatUtils.fileInputRef}
                    onFileSelect={chatUtils.handleFileSelect}
                    onLocationShare={chatUtils.handleLocationShare}
                    onCheckMicrophonePermission={chatUtils.checkMicrophonePermission}
                    toast={toast}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">یک مخاطب را انتخاب کنید</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Block User Confirmation Dialog */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مسدود کردن کاربر</DialogTitle>
            <DialogDescription>
              آیا مطمئن هستید که می‌خواهید کاربر {selectedChat?.customerName} ({selectedChat?.customerPhone}) را مسدود کنید؟
              <br />
              <span className="text-destructive font-medium">این عمل قابل بازگشت نیست.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockDialogOpen(false)}
              disabled={isBlocking}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockUser}
              disabled={isBlocking}
            >
              {isBlocking ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  در حال مسدود کردن...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 ml-2" />
                  مسدود کردن
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
