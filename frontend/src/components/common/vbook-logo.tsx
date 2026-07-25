"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface VBookLogoProps {
    /** Size variant controlling the rendered dimensions */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    /** Force a specific theme regardless of current */
    forceTheme?: "light" | "dark";
}

// The logo image always stays the same (the premium dark-bg design).
// We adapt the CONTAINER to look beautiful in both themes.
const LOGO_SRC = "/images/vbook-logo.png";

const SIZE_MAP = {
    //            image dims   container h   border-radius
    xs: { width: 90,  height: 28,  imgClass: "h-7 w-auto"      },
    sm: { width: 120, height: 37,  imgClass: "h-9 w-auto"      },
    md: { width: 160, height: 50,  imgClass: "h-[50px] w-auto" },
    lg: { width: 210, height: 65,  imgClass: "h-[65px] w-auto" },
    xl: { width: 260, height: 80,  imgClass: "h-20 w-auto"     },
};

/**
 * Theme-aware VBOOK logo component.
 *
 * Uses the same premium image (dark-bg, purple gradient V, silver BOOK) everywhere.
 *
 * • Dark theme  → image shown as-is on the dark card background. Seamless.
 * • Light theme → image is wrapped in a rich dark pill with a subtle purple glow
 *                 so the baked-in dark background looks intentional and branded.
 */
const VBookLogo = ({ size = "md", className = "", forceTheme }: VBookLogoProps) => {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const effectiveTheme = forceTheme ?? (mounted ? resolvedTheme : "dark");
    const isDark = effectiveTheme === "dark";

    const { width, height, imgClass } = SIZE_MAP[size];

    const image = (
        <Image
            src={LOGO_SRC}
            alt="VBOOK"
            width={width}
            height={height}
            className={`object-contain ${imgClass} transition-all duration-300`}
            priority
        />
    );

    if (isDark) {
        // Dark theme: logo background blends naturally with the dark sidebar/card.
        return (
            <div className={`inline-flex items-center justify-center ${className}`}>
                {image}
            </div>
        );
    }

    // Light theme: Use filter tricks to invert the dark background to light/transparent,
    // invert the light text to a dark premium charcoal, and rotate the hue back to preserve
    // the original purple-to-blue gradient brand color. Use multiply to hide the background entirely.
    return (
        <div className={`inline-flex items-center justify-center mix-blend-multiply select-none ${className}`}>
            <Image
                src={LOGO_SRC}
                alt="VBOOK"
                width={width}
                height={height}
                className={`object-contain ${imgClass} transition-all duration-300`}
                style={{
                    filter: "invert(1) hue-rotate(180deg) contrast(1.1) brightness(1.02)",
                }}
                priority
            />
        </div>
    );
};

export default VBookLogo;
