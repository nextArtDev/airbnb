"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

export interface ChatMessageProps {
  role: "user" | "assistant" | "system" | "data" | "tool" | string;
  content: string;
  pending?: boolean;
}

export function ChatMessage({ role, content, pending }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="size-7 shrink-0 border bg-card">
          <AvatarFallback className="bg-rose-600 text-white">
            <Bot className="size-4" aria-hidden />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-ee-sm bg-rose-600 text-white"
            : "rounded-es-sm bg-muted text-foreground",
          pending && "animate-pulse motion-reduce:animate-none",
        )}
        dir="auto"
      >
        {content}
      </div>
      {isUser && (
        <Avatar className="size-7 shrink-0 border bg-card">
          <AvatarFallback>
            <User className="size-4 text-muted-foreground" aria-hidden />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
