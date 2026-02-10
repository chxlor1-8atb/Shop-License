import React from "react";
import { FaArrowRight, FaCheck, FaSpinner, FaXmark } from "react-icons/fa6";

export const LoginSlider = ({ slider, loading, unlocked, error }) => {
  let icon = <FaArrowRight />;
  if (loading) icon = <FaSpinner />;
  else if (unlocked) icon = <FaCheck />;
  else if (error) icon = <FaXmark />;

  return (
    <div className="btn-wrapper">
      <div
        className={`slide-container ${loading ? "loading" : ""} ${
          unlocked ? "unlocked" : ""
        } ${error ? "error" : ""}`}
        id="slideContainer"
        ref={slider.slideContainerRef}
      >
        <div
          className="slide-bg"
          style={{
            width:
              slider.slideProgress > 0
                ? `${slider.slideProgress + 25}px`
                : "0px",
          }}
        ></div>
        <div className="slide-text">เลื่อนเพื่อเข้าสู่ระบบ »</div>
        <div
          className="slider-btn"
          id="sliderBtn"
          ref={slider.sliderBtnRef}
          style={{
            '--slide-x': `${slider.slideProgress > 4 ? slider.slideProgress - 4 : 0}px`,
            transition: slider.isDragging
              ? "none"
              : "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s ease",
          }}
          onMouseDown={slider.handleStartDrag}
          onTouchStart={slider.handleStartDrag}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
