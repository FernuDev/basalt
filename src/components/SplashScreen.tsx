interface SplashScreenProps {
  visible: boolean;
}

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse 60% 50% at 75% 80%, rgba(124,79,212,0.18) 0%, transparent 70%), #0A0B13",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease",
        pointerEvents: visible ? "all" : "none",
      }}
    >
      {/* Icon with screen blend to dissolve its dark background */}
      <img
        src="/branding/app_icon.png"
        alt="Basalt"
        style={{
          width: 120,
          height: 120,
          objectFit: "contain",
          mixBlendMode: "screen",
          filter: "brightness(1.15)",
        }}
      />

      {/* Wordmark */}
      <span
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 28,
          fontWeight: 700,
          color: "#E8EAFF",
          letterSpacing: "-0.01em",
          lineHeight: 1,
          marginTop: -4,
        }}
      >
        Basalt
      </span>

      <div
        style={{
          width: 280,
          height: 2,
          background: "#1E1F32",
          borderRadius: 2,
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            width: visible ? "100%" : "0%",
            background: "linear-gradient(90deg, #4F7EE8, #7C4FD4)",
            borderRadius: 2,
            transition: visible
              ? "width 1.8s cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
          }}
        />
      </div>
    </div>
  );
}
