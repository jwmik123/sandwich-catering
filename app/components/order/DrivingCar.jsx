"use client";
import React, { useEffect, useRef, useState } from "react";

// Path around a rounded rectangle, clockwise from the top-left corner. The car
// drives on it with its wheels on the line, so it always stays outside the box.
const roundedRectPath = (width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `V ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    "Z",
  ].join(" ");
};

/**
 * Wrap a card to have the sandwich car from the logo drive around its edge.
 * `radius` should match the card's border radius.
 */
export default function DrivingCar({ children, radius = 28, className }) {
  const wrapperRef = useRef(null);
  const [path, setPath] = useState(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setPath(roundedRectPath(width, height, radius));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [radius]);

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {children}
      {path && (
        <img
          src="/images/car.svg"
          alt=""
          aria-hidden="true"
          className="driving-car pointer-events-none absolute left-0 top-0 hidden w-[84px] md:block"
          style={{ offsetPath: `path('${path}')` }}
        />
      )}
    </div>
  );
}
