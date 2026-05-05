"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-text-primary mb-4">
            Ready to get started?
          </h2>
          <p className="text-text-secondary mb-8">
            Join thousands of Nigerians finding and offering trusted services
            every day. Create your free account in under 2 minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button variant="primary" size="lg">
                Find Now →
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="lg">
                Join as Pro
              </Button>
            </Link>
          </div>

          {/* Home service cross-link */}
          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm text-text-secondary mb-3">
              Need professionals to come to you?
            </p>
            <Link href="/homeservice">
              <Button variant="outline" size="md">
                🏠 Explore Home Service →
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}