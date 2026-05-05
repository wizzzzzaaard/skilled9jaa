"use client";

import { motion } from "framer-motion";
import { Shield, CreditCard, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "NIN Verified",
    description:
      "Every service provider is verified with their National Identification Number",
  },
  {
    icon: CreditCard,
    title: "Escrow Payment",
    description:
      "Your payment is held safely until the service is completed satisfactorily",
  },
  {
    icon: Users,
    title: "Trustee System",
    description:
      "Nominate up to 2 trusted contacts who are notified when you book a service",
  },
];

export function TrustSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-text-primary mb-2">
            Why trust us
          </h2>
          <p className="text-text-secondary">
            Built for safety and peace of mind
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
