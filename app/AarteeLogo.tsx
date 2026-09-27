import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["700"], style: ["italic"] });

export default function AarteeLogo({ size = 26 }: { size?: number }) {
  return (
    <span
      className={dmSans.className}
      aria-label="aartee."
      style={{ fontSize: size, lineHeight: 1, fontStyle: "italic", fontWeight: 700,
               letterSpacing: "-0.055em", color: "inherit", whiteSpace: "nowrap" }}
    >
      aartee<span style={{ color: "#F5B53F" }}>.</span>
    </span>
  );
}
