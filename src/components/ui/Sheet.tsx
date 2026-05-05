"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideDragHandle?: boolean;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  hideDragHandle = false,
}: SheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative bg-white rounded-t-2xl shadow-xl w-full max-h-[90vh] overflow-y-auto",
              className
            )}
          >
            {!hideDragHandle && (
              <div className="sticky top-0 bg-white z-10 px-6 pt-3 pb-2 border-b border-gray-50">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  {title && (
                    <h2 className="text-lg font-semibold text-text-primary">
                      {title}
                    </h2>
                  )}
                  <button
                    onClick={onClose}
                    className="ml-auto p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
