import React from "react";

export const LoginSlider = ({ slider, loading, unlocked, error }) => {
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
            left:
              slider.slideProgress > 0 ? `${slider.slideProgress}px` : "4px",
            transition: slider.isDragging ? "none" : "left 0.3s ease",
          }}
          onMouseDown={slider.handleStartDrag}
          onTouchStart={slider.handleStartDrag}
        >
          <i className="fas fa-arrow-right"></i>
        </div>
      </div>
    </div>
  );
};
