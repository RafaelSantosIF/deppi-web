"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDE_DURATION_MS = 60_000;

const images = [
  "/images/login_screen1.jpg",
  "/images/login_screen2.jpg",
  "/images/login_screen3.jpg",
];

export function AuthImageCarousel() {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length);
    }, SLIDE_DURATION_MS);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="auth-photos" aria-hidden="true">
      {images.map((src, index) => (
        <Image
          className={`auth-photo${index === activeImage ? " auth-photo-active" : ""}`}
          key={src}
          src={src}
          alt=""
          fill
          sizes="(max-width: 700px) 100vw, 50vw"
          priority={index === 0}
        />
      ))}
    </div>
  );
}
