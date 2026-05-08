"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Bell, Phone, User, LogOut } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { usePathname } from "next/navigation";

export function Header() {
  const { user, session } = useSessionStore();
  const pathname = usePathname();
  const logoControls = useAnimation();
  const [showPhone, setShowPhone] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  // Route signup based on which landing page the user is on
  const signUpHref = pathname?.startsWith("/homeservice")
    ? "/signup?mode=homeservice"
    : "/signup";

  const navLinks = [
    { label: "Find Talent", href: "/find" },
    { label: "Post a Job", href: "/jobs" },
    { label: "Home Service", href: "/homeservice" },
  ];

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      runAnimation();
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-user-menu]")) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runAnimation = async () => {
    await new Promise((r) => setTimeout(r, 700));
    const containerEl = innerRef.current;
    if (!containerEl) return;
    const containerWidth = containerEl.offsetWidth;
    const logoSize = 36;
    const targetX = containerWidth - logoSize - 72;
    const circumference = Math.PI * logoSize;
    const rotations = (targetX / circumference) * 360;

    await logoControls.start({
      x: targetX,
      rotate: rotations,
      transition: { duration: 1.1, ease: [0.4, 0, 0.6, 1] },
    });

    setShowPhone(true);

    await logoControls.start({
      rotate: [rotations, rotations - 22, rotations + 22, rotations - 18, rotations + 18, rotations - 10, rotations + 10, rotations],
      x: [targetX, targetX - 4, targetX + 4, targetX - 4, targetX + 4, targetX],
      transition: { duration: 0.75 },
    });

    await new Promise((r) => setTimeout(r, 450));
    setShowPhone(false);

    await logoControls.start({
      x: 0,
      rotate: 0,
      transition: { duration: 1.1, ease: [0.4, 0, 0.6, 1] },
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={innerRef} className="flex items-center justify-between h-11">

          {/* Logo */}
          <Link href={session && user ? "/dashboard" : "/"} className="flex items-center shrink-0">
            <motion.div animate={logoControls} className="relative w-9 h-9">
              <AnimatePresence mode="wait">
                {showPhone ? (
                  <motion.div
                    key="phone"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.18 }}
                    className="w-9 h-9 rounded-full bg-green-800 flex items-center justify-center shadow-md"
                  >
                    <Phone className="w-[18px] h-[18px] text-white fill-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="logo"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Image
                      src="https://vqzvvupwhzjaahfqgron.supabase.co/storage/v1/object/public/skilled-niger-assets/marketplace/1000084258.webp"
                      alt="Skilled9ja"
                      width={36}
                      height={36}
                      className="object-contain rounded-full"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {session && user ? (
              <div className="relative" data-user-menu>
                <button onClick={() => setShowUserMenu(!showUserMenu)}>
                  <Avatar src={user.profile_image_url} name={user.full_name} size="sm" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-xl shadow-lg w-44 z-50 py-1">
                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Bell className="w-4 h-4" /> Notifications
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      onClick={() => useSessionStore.getState().signOut()}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="text" size="sm">Log In</Button>
                </Link>
                <Link href={signUpHref}>
                  <Button variant="primary" size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center">
            {session && user ? (
              <div className="relative" data-user-menu>
                <button onClick={() => setShowUserMenu(!showUserMenu)}>
                  <Avatar src={user.profile_image_url} name={user.full_name} size="sm" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-xl shadow-lg w-44 z-50 py-1">
                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Bell className="w-4 h-4" /> Notifications
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      onClick={() => useSessionStore.getState().signOut()}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href={signUpHref}>
                <Button variant="primary" size="sm">Sign Up</Button>
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
