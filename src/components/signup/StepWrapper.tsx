"use client";

import { motion } from "framer-motion";

interface Props {
  stepKey: string;
  children: React.ReactNode;
}

export function StepWrapper({ stepKey, children }: Props) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {children}
    </motion.div>
  );
}