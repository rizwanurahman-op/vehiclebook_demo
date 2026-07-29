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

const LIGHT_LOGO_SRC = "/images/vbook_logo_light_theme.png";
const DARK_LOGO_SRC = "/images/vbook_logo_transparent.png";

const SIZE_MAP = {
    //            image dims   container h
    xs: { width: 90,  height: 28,  imgClass: "h-7 w-auto"      },
    sm: { width: 120, height: 37,  imgClass: "h-9 w-auto"      },
    md: { width: 160, height: 50,  imgClass: "h-[50px] w-auto" },
    lg: { width: 210, height: 65,  imgClass: "h-[65px] w-auto" },
    xl: { width: 260, height: 80,  imgClass: "h-20 w-auto"     },
};

/**
 * Theme-aware VBOOK logo component.
 *
 * Renders transparent PNG logos that seamlessly blend with the background in both light and dark themes.
 */
const VBookLogo = ({ size = "md", className = "", forceTheme }: VBookLogoProps) => {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const effectiveTheme = forceTheme ?? (mounted ? resolvedTheme : "light");
    const isDark = effectiveTheme === "dark";

    const { width, height, imgClass } = SIZE_MAP[size];
    const logoSrc = isDark ? DARK_LOGO_SRC : LIGHT_LOGO_SRC;

    return (
        <div className={`inline-flex items-center justify-center select-none ${className}`}>
            <Image
                src={logoSrc}
                alt="VBOOK"
                width={width}
                height={height}
                className={`object-contain ${imgClass} transition-all duration-300`}
                priority
            />
        </div>
    );
};

export default VBookLogo;

