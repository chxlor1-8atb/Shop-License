import React from "react";
import { FaCheck } from "react-icons/fa6";

const iconMap = {
  check: <FaCheck />,
};

export const FeatureTag = ({ color, icon, text }) => (
  <div className={`feature-tag feature-tag--${color}`}>
    <span className="feature-icon">{iconMap[icon] || <FaCheck />}</span> {text}
  </div>
);
