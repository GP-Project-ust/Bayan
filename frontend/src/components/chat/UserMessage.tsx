"use client";

import React from "react";
import type { ChatMessage } from "@/types";
import { formatMessageTime } from "@/lib/chat/format";

interface UserMessageProps {
  message: ChatMessage;
  className?: string;
}

export function UserMessage({ message, className = "" }: UserMessageProps) {
  const time = formatMessageTime(message.timestamp);

  return (
    <div className={`cx-question ${className}`}>
      <p>{message.content}</p>
      <time
        dateTime={new Date(message.timestamp).toISOString()}
        aria-label={`وقت الإرسال ${time}`}
      >
        {time}
      </time>
    </div>
  );
}
