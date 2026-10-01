import darkLogo from "@/assets/speed-dark.svg.asset.json";
import lightLogo from "@/assets/speed-light.svg.asset.json";

type AppIconProps = {
  variant?: "auto" | "dark" | "light";
  className?: string;
};

export function AppIcon({ variant = "auto", className = "" }: AppIconProps) {
  return (
    <span className={`app-icon app-icon-${variant} ${className}`} role="img" aria-label="Speed">
      <img className="app-icon-dark" src={darkLogo.url} alt="" aria-hidden="true" />
      <img className="app-icon-light" src={lightLogo.url} alt="" aria-hidden="true" />
    </span>
  );
}