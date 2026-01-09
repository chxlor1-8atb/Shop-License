import React from "react";

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
    <i className={`fas fa-${icon} input-icon`}></i>
    {togglePassword && (
      <button
        type="button"
        className="password-toggle"
        onClick={togglePassword}
      >
        <i
          className={`fas ${isPasswordVisible ? "fa-eye-slash" : "fa-eye"}`}
        ></i>
      </button>
    )}
  </div>
);
