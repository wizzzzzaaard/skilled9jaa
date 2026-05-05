"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface PageLoaderProps {
  fullScreen?: boolean;
}

export function PageLoader({ fullScreen = true }: PageLoaderProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-[100] flex items-center justify-center bg-white"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClasses}>
      <div className="relative w-64 h-16 flex items-center justify-center">
        <motion.div
          animate={{
            x: [-120, 120, -120],
            rotate: [0, 360, 720],
          }}
          transition={{
            duration: 2.4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="flex items-center justify-center"
        >
          <Image
            src="https://vqzvvupwhzjaahfqgron.supabase.co/storage/v1/object/public/skilled-niger-assets/marketplace/1000084258.webp"
            alt="Skilled9ja"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </motion.div>
      </div>
    </div>
  );
}