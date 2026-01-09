import React from "react";

export const FeatureTag = ({ color, icon, text }) => (
  <div className={`feature-tag feature-tag--${color}`}>
    <i className={`fas fa-${icon}`}></i> {text}
  </div>
);
