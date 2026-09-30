"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const STRAIGHT_SPEED = 95; // px per second on the long sides
const CORNER_SPEED = 32; // px per second through the corners
const CRUMB_COLORS = ["#C98B4E", "#E2B676", "#D4B08A", "#B97A45"];

// A rounded rectangle, clockwise from the end of the top-left corner, split
// into its straight sides and corner arcs so each can get its own speed. The
// car drives on it with its wheels on the line, so it stays outside the box.
const buildGeometry = (width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  const d = [
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
  const arc = (Math.PI * r) / 2;
  const segments = [
    { length: width - 2 * r, corner: false },
    { length: arc, corner: true },
    { length: height - 2 * r, corner: false },
    { length: arc, corner: true },
    { length: width - 2 * r, corner: false },
    { length: arc, corner: true },
    { length: height - 2 * r, corner: false },
    { length: arc, corner: true },
  ];
  const total = segments.reduce((sum, s) => sum + s.length, 0);
  return { d, segments, total };
};

// Fast on the straights, braking into each corner, leaning a little in it.
const buildLap = ({ segments, total }) => {
  const timed = segments.map((s) => ({
    ...s,
    time: s.length / (s.corner ? CORNER_SPEED : STRAIGHT_SPEED),
  }));
  const duration = timed.reduce((sum, s) => sum + s.time, 0);
  const frames = [];
  let distance = 0;
  let time = 0;
  timed.forEach((s) => {
    frames.push({
      offset: time / duration,
      offsetDistance: `${(distance / total) * 100}%`,
      offsetRotate: "auto",
      // Straights speed up and brake down to corner speed; corners stay steady.
      easing: s.corner ? "linear" : "cubic-bezier(0.45, 0.15, 0.55, 0.85)",
    });
    if (s.corner) {
      frames.push({
        offset: (time + s.time / 2) / duration,
        offsetDistance: `${((distance + s.length / 2) / total) * 100}%`,
        offsetRotate: "auto -5deg",
        easing: "linear",
      });
    }
    distance += s.length;
    time += s.time;
  });
  frames.push({ offset: 1, offsetDistance: "100%", offsetRotate: "auto" });
  return { frames, duration: duration * 1000 };
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Wrap a card to have the sandwich car from the logo drive around its edge,
 * leaving crumbs behind. `radius` should match the card's border radius.
 * The ref exposes driveOff(), which sends the car off screen.
 */
const DrivingCar = forwardRef(function DrivingCar({ children, radius = 28, className }, ref) {
  const wrapperRef = useRef(null);
  const carRef = useRef(null);
  const pathRef = useRef(null);
  const crumbLayerRef = useRef(null);
  const animations = useRef({});
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setGeometry(buildGeometry(width, height, radius));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [radius]);

  useEffect(() => {
    const car = carRef.current;
    if (!car || !geometry) return;
    car.style.offsetPath = `path('${geometry.d}')`;

    if (prefersReducedMotion()) {
      car.style.offsetDistance = "4%";
      return;
    }

    // Keep the car where it was when the card resizes.
    const progress = animations.current.drive?.effect?.getComputedTiming().progress || 0.02;
    Object.values(animations.current).forEach((a) => a?.cancel?.());

    const lap = buildLap(geometry);
    const drive = car.animate(lap.frames, { duration: lap.duration, iterations: Infinity });
    drive.currentTime = progress * lap.duration;

    // Cobblestones: a small bounce with a little pitch.
    const bob = car.animate(
      [
        { transform: "translateY(0) rotate(0deg)" },
        { transform: "translateY(-2px) rotate(-1.2deg)", offset: 0.5 },
        { transform: "translateY(0) rotate(0.6deg)" },
      ],
      { duration: 420, iterations: Infinity, easing: "ease-in-out" }
    );
    animations.current = { drive, bob };

    // Crumbs fall off the sandwich on the roof and stay on the road a moment.
    const dropCrumbs = () => {
      const layer = crumbLayerRef.current;
      const path = pathRef.current;
      if (!layer || !path || !car.offsetParent || document.hidden) return;
      if (layer.childElementCount > 36) return;
      const percent = parseFloat(getComputedStyle(car).offsetDistance) || 0;
      const behind = (percent / 100) * geometry.total - 30;
      const count = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const point = path.getPointAtLength(
          (behind - Math.random() * 10 + geometry.total) % geometry.total
        );
        const size = 3 + Math.random() * 3;
        const crumb = document.createElement("span");
        crumb.className = "driving-car-crumb";
        Object.assign(crumb.style, {
          left: `${point.x - size / 2 + (Math.random() * 6 - 3)}px`,
          top: `${point.y - size / 2 + (Math.random() * 6 - 3)}px`,
          width: `${size}px`,
          height: `${size * (0.7 + Math.random() * 0.5)}px`,
          background: CRUMB_COLORS[Math.floor(Math.random() * CRUMB_COLORS.length)],
        });
        layer.appendChild(crumb);
        const drift = `translate(${Math.random() * 6 - 3}px, ${Math.random() * 4}px)`;
        crumb
          .animate(
            [
              { opacity: 0, transform: `scale(0.3) rotate(${Math.random() * 90}deg)` },
              { opacity: 1, transform: "scale(1) rotate(0deg)", offset: 0.1 },
              { opacity: 0.9, transform: `${drift} scale(1)`, offset: 0.7 },
              { opacity: 0, transform: `${drift} scale(0.6)` },
            ],
            { duration: 2800, easing: "ease-out", fill: "forwards" }
          )
          .finished.then(
            () => crumb.remove(),
            () => crumb.remove()
          );
      }
    };
    const crumbTimer = window.setInterval(dropCrumbs, 420);

    return () => window.clearInterval(crumbTimer);
  }, [geometry]);

  useEffect(
    () => () => Object.values(animations.current).forEach((a) => a?.cancel?.()),
    []
  );

  useImperativeHandle(ref, () => ({
    // Resolves once the car is on its way, so the next screen can open.
    driveOff: () =>
      new Promise((resolve) => {
        const car = carRef.current;
        if (!car || !car.offsetParent || prefersReducedMotion()) {
          resolve();
          return;
        }
        animations.current.bob?.cancel();
        animations.current.drive?.pause();
        // Along its own heading: transform is applied after the motion path.
        animations.current.exit = car.animate(
          [
            { transform: "translateX(0) rotate(0deg)", easing: "ease-out" },
            // A short wheelspin backwards, nose up, then full throttle.
            { transform: "translateX(-8px) rotate(-4deg)", offset: 0.12, easing: "cubic-bezier(0.3, 0, 0.8, 0.5)" },
            { transform: "translateX(1400px) rotate(0deg)" },
          ],
          { duration: 700, fill: "forwards" }
        );
        window.setTimeout(resolve, 620);
      }),
  }));

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {children}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-visible"
      >
        {geometry && <path ref={pathRef} d={geometry.d} fill="none" />}
      </svg>
      <div ref={crumbLayerRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      {geometry && (
        <img
          ref={carRef}
          src="/images/car.svg"
          alt=""
          aria-hidden="true"
          className="driving-car pointer-events-none absolute left-0 top-0 z-20 hidden w-[84px] md:block"
        />
      )}
    </div>
  );
});

export default DrivingCar;
