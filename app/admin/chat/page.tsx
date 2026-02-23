"use client";

import { AdminChat } from "@/components/admin/admin-chat";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AdminChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const initialCustomerPhone = searchParams.get("phone") || undefined;

  // Handle back navigation
  const handleClose = () => {
    router.push("/admin");
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden -m-4 lg:-m-6">
      <AdminChat
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            handleClose();
          }
        }}
        initialCustomerPhone={initialCustomerPhone}
      />
    </div>
  );
}

