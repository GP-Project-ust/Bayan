"use client";

import React from "react";
import type { ChatMessage } from "@/types";
import { User } from "lucide-react";

interface UserMessageProps {
  message: ChatMessage;
  className?: string;
}

export function UserMessage({ message, className = "" }: UserMessageProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`bayan-msg-row user ${className}`}>
      <div className="bayan-msg-bubble user">
        <p className="bayan-msg-content">{message.content}</p>
        <span className="bayan-msg-time" aria-label={`وقت الإرسال: ${formattedTime}`}>
          {formattedTime}
        </span>
      </div>
      <div className="bayan-avatar user" aria-hidden="true">
        <User size={18} className="text-teal-200" />
      </div>
    </div>
  );
}
