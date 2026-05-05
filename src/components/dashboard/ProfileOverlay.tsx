"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ProviderSheet } from "./ProviderSheet";
import type { RadarProfile } from "@/types/radar";

interface Props {
  selected: RadarProfile | null;
  onClose: () => void;
}

export function ProfileOverlay({ selected, onClose }: Props) {
  return (
    <AnimatePresence>
      {selected && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20"
          />
          <ProviderSheet profile={selected} onClose={onClose} />
        </>
      )}
    </AnimatePresence>
  );
}