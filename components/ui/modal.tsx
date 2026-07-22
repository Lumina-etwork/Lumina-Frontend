"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-lg",
          "dark:border-zinc-800 dark:bg-zinc-950",
          className
        )}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-sm p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
