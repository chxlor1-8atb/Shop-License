import React, { useCallback, useEffect } from "react";

import { useLoginSlider } from "@/hooks/useLoginSlider";
import { useAuthLogin } from "@/hooks/useAuthLogin";
import { InputGroup } from "./InputGroup";
import { LoginSlider } from "./LoginSlider";
import { WaveDivider } from "./WaveDivider";

export const LoginForm = ({ onSuccess }) => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    loading,
    error,
    unlocked,
    checkingAuth,
    submitLogin,
  } = useAuthLogin();

  const onUnlock = useCallback(async () => {
    await submitLogin();
  }, [submitLogin]);

  const slider = useLoginSlider(unlocked, loading, onUnlock);

  /* Removed Toast State and useEffects related to Toast */

  // Only keep the error reset logic
  useEffect(() => {
    if (error) {
      slider.resetSlider();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, slider.resetSlider]);

  // Only keep the success animation logic
  useEffect(() => {
    if (unlocked && onSuccess) {
      onSuccess();
    }
  }, [unlocked, onSuccess]);

  const handleManualSubmit = async () => {
    slider.maximizeSlider();
    await onUnlock();
  };

  if (checkingAuth) {
    return (
      <div className="login-form-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="login-form-content">
      <WaveDivider />
      <header className="form-header">
        <h2 className="form-header__title">ยินดีต้อนรับกลับมา</h2>
        <p className="form-header__subtitle">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleManualSubmit();
        }}
        noValidate
      >
        <InputGroup
          id="username"
          type="text"
          label="ชื่อผู้ใช้"
          value={username}
          onChange={setUsername}
          icon="user"
        />

        <InputGroup
          id="password"
          type={showPassword ? "text" : "password"}
          label="รหัสผ่าน"
          value={password}
          onChange={setPassword}
          icon="lock"
          togglePassword={() => setShowPassword(!showPassword)}
          isPasswordVisible={showPassword}
        />

        <div className="remember-me">
          <label htmlFor="rememberMe" className="remember-me__label">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              className="remember-me__checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="remember-me__checkmark"></span>
            <span className="remember-me__text">จดจำฉัน</span>
          </label>
        </div>

        <LoginSlider
          slider={slider}
          loading={loading}
          unlocked={unlocked}
          error={error}
        />
      </form>
    </div>
  );
};
