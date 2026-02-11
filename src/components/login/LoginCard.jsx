"use client";

import { useRef, useCallback } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginCard({ children }) {
  const cardRef = useRef(null);

  const handleLoginSuccess = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.classList.add("success-exit");
    }
  }, []);

  return (
    <div className="login-card" ref={cardRef}>
      {children}
      <div className="card-right">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}
