import React from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa6";

const iconMap = {
  user: <FaUser />,
  lock: <FaLock />,
};

export const InputGroup = ({
  id,
  type,
  label,
  value,
  onChange,
  icon,
  togglePassword,
  isPasswordVisible,
}) => (
  <div className="input-group">
    <input
      type={type}
      id={id}
      name={id}
      className={`input-field ${
        togglePassword ? "input-field--with-toggle" : ""
      }`}
      placeholder=" "
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={type === "password" ? "current-password" : "username"}
      required
    />
    <label htmlFor={id} className="input-label">
      {label}
    </label>
    <span className="input-icon">{iconMap[icon]}</span>
    {togglePassword && (
      <button
        type="button"
        className="password-toggle"
        onClick={togglePassword}
        aria-label={isPasswordVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
      >
        {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
      </button>
    )}
  </div>
);
