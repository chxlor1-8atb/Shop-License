"use client";

import { useRef, useCallback } from "react";
import { LoginForm } from "./LoginForm";
import { useTiltCard } from "@/hooks/useTiltCard";

export default function LoginCard({ children }) {
  const cardRef = useRef(null);
  const tiltRef = useTiltCard({ max: 5, scale: 1.005, glare: true });

  const handleLoginSuccess = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.classList.add("success-exit");
    }
  }, []);

  return (
    <div className="login-card fx-card-tilt" ref={(node) => {
      cardRef.current = node;
      tiltRef.current = node;
    }}>
      {/* Spotlight glare วางบนการ์ด */}
      <div className="login-card__glare" aria-hidden="true" />
      {children}
      <div className="card-right">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}
