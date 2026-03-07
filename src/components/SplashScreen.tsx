import { useEffect, useRef } from "react";

interface SplashScreenProps {
  visible: boolean;
}

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Sparse, subtle stars
    const count = 38;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      size: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.015 + 0.006,
    }));

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W();
        if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H();
        if (p.y > H()) p.y = 0;
        p.twinkle += p.twinkleSpeed;

        const alpha = p.opacity * (0.5 + 0.5 * Math.sin(p.twinkle));
        ctx.fillStyle = `rgba(168,139,250,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
}

export function SplashScreen({ visible }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleCanvas(canvasRef);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse 50% 40% at 50% 60%, rgba(124,79,212,0.1) 0%, transparent 70%), #0A0B13",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 450ms ease",
        pointerEvents: visible ? "all" : "none",
        overflow: "hidden",
      }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />

      {/* Logo */}
      <img
        src="/branding/app_icon.png"
        alt="Basalt"
        style={{
          position: "relative",
          zIndex: 1,
          width: 108,
          height: 108,
          objectFit: "contain",
          mixBlendMode: "screen",
          filter: "brightness(1.15) drop-shadow(0 0 16px rgba(124,79,212,0.4))",
          animation: "splashFloat 4s ease-in-out infinite",
        }}
      />

      {/* Wordmark */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 26,
          fontWeight: 700,
          color: "#E8EAFF",
          letterSpacing: "-0.01em",
          lineHeight: 1,
          marginTop: -6,
        }}
      >
        Basalt
      </span>

      {/* Spinner */}
      <div style={{ position: "relative", zIndex: 1, marginTop: 4 }}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          style={{ animation: "splashSpin 1s linear infinite", display: "block" }}
        >
          <circle
            cx="14" cy="14" r="11"
            stroke="#1E1F32"
            strokeWidth="2.5"
          />
          <circle
            cx="14" cy="14" r="11"
            stroke="url(#spinGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="44"
            strokeDashoffset="30"
          />
          <defs>
            <linearGradient id="spinGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F7EE8" />
              <stop offset="1" stopColor="#7C4FD4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <style>{`
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes splashSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
