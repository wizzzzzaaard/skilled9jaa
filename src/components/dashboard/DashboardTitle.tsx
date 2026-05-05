"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  subtitle: string;
}

export function DashboardTitle({ title, subtitle }: Props) {
  return (
    <div className="px-4 pt-2 pb-1">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>
      </motion.div>
    </div>
  );
}