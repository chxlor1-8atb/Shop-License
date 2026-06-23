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
        {/* slide-bg transform is driven directly by the hook (updateDOM)
            to keep drag tracking at 60fps without React re-renders. */}
        <div className="slide-bg" />
        <div className="slide-text">เลื่อนเพื่อเข้าสู่ระบบ »</div>
        <div
          className="slider-btn"
          id="sliderBtn"
          ref={slider.sliderBtnRef}
          onMouseDown={slider.handleStartDrag}
          onTouchStart={slider.handleStartDrag}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
