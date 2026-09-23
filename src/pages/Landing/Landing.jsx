import { useNavigate } from "react-router-dom"

import kasukabeBg from "../../assets/kasukabe_bg.jpg"

function Landing() {
    const navigate = useNavigate()

    return (
        <main className="relative h-screen w-full overflow-hidden bg-black">
            {/* Background */}
            <img
                src={kasukabeBg}
                alt="Kasukabe in spring"
                className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                    object-[50%_center]
                    sm:object-[58%_center]
                "
            />

            <div className="absolute inset-0 bg-black/5" />

            {/* Top Left */}
            <div
                className="
                    absolute
                    left-7
                    top-7
                    z-20
                    max-w-44
                    text-white
                    sm:left-10
                    sm:top-9
                "
            >
                <p
                    className="
                        font-serif
                        text-[11px]
                        uppercase
                        leading-relaxed
                        tracking-[0.28em]
                        [text-shadow:0_2px_5px_rgba(0,0,0,0.65)]
                        sm:text-xs
                    "
                >
                    A little
                    <br />
                    photobooth
                    <br />
                    from Kasukabe
                </p>
            </div>

            {/* Top Right */}
            <div
                className="
                    absolute
                    right-7
                    top-7
                    z-20
                    text-right
                    text-white
                    sm:right-10
                    sm:top-9
                "
            >
                <p
                    className="
                        font-serif
                        text-[11px]
                        uppercase
                        leading-relaxed
                        tracking-[0.25em]
                        [text-shadow:0_2px_5px_rgba(0,0,0,0.65)]
                        sm:text-xs
                    "
                >
                    Made for
                    <br />
                    memories ♡
                </p>
            </div>

            {/* Landing */}
            <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-20">
                <div
                    className="
                        relative
                        w-full
                        max-w-xl
                        overflow-hidden
                        rounded-[28px]
                        border
                        border-white/60
                        bg-white/[0.18]
                        px-7
                        py-10
                        text-center
                        shadow-[0_20px_80px_rgba(0,0,0,0.18)]
                        backdrop-blur-xl
                        sm:px-12
                        sm:py-11
                    "
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />

                    {/* Small mark */}
                    <div className="mb-5 flex justify-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/10 text-white backdrop-blur-sm">
                            <span className="text-base [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                                ♡
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.25)]">
                        <h1
                            className="
                                font-serif
                                text-[clamp(3.5rem,7vw,5rem)]
                                font-normal
                                leading-[0.82]
                                tracking-[-0.055em]
                            "
                        >
                            Kasukabe Cam
                        </h1>
                    </div>

                    {/* Divider */}
                    <div className="mx-auto my-6 flex w-36 items-center justify-center gap-4">
                        <div className="h-px flex-1 bg-white/70" />
                        <span className="text-xs text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                            ✿ ✿ ✿
                        </span>
                        <div className="h-px flex-1 bg-white/70" />
                    </div>

                    {/* Message */}
                    <p
                        className="
                            mx-auto
                            max-w-md
                            font-serif
                            text-sm
                            leading-relaxed
                            tracking-[0.06em]
                            text-white/90
                            [text-shadow:0_2px_5px_rgba(0,0,0,0.45)]
                            sm:text-[15px]
                        "
                    >
                        Because apparently I never take you to photobooths.
                    </p>

                    {/* Let's Snap */}
                    <button
                        type="button"
                        onClick={() => navigate("/select")}
                        className="
                            mt-7
                            rounded-full
                            border
                            border-white/30
                            bg-white/[0.10]
                            px-8
                            py-2.5
                            font-serif
                            text-xs
                            uppercase
                            tracking-[0.25em]
                            text-white
                            [text-shadow:0_2px_4px_rgba(0,0,0,0.45)]
                            shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_20px_rgba(0,0,0,0.08)]
                            backdrop-blur-md
                            transition-all
                            duration-300
                            hover:border-white/40
                            hover:bg-white/[0.16]
                            hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_6px_24px_rgba(0,0,0,0.12)]
                            hover:tracking-[0.3em]
                            active:scale-95
                        "
                    >
                        Let's Snap
                        <span className="ml-3">→</span>
                    </button>
                </div>
            </section>

            {/* Bottom Left */}
            <div
                className="
                    absolute
                    bottom-7
                    left-7
                    z-20
                    hidden
                    text-white
                    sm:bottom-9
                    sm:left-10
                    sm:block
                "
            >
                <p
                    className="
                        font-serif
                        text-[10px]
                        uppercase
                        tracking-[0.24em]
                        [text-shadow:0_2px_5px_rgba(0,0,0,0.7)]
                        sm:text-xs
                    "
                >
                    ♡ Kasukabe, Japan
                </p>
            </div>

            {/* Bottom Navigation */}
            <nav
                className="
                    absolute
                    bottom-7
                    left-1/2
                    z-20
                    flex
                    -translate-x-1/2
                    gap-5
                    whitespace-nowrap
                    text-white
                    sm:bottom-9
                    sm:left-auto
                    sm:right-10
                    sm:translate-x-0
                    sm:gap-7
                "
            >
                {["About", "Gallery", "Credits"].map((item) => (
                    <button
                        key={item}
                        type="button"
                        className="
                            font-serif
                            text-[10px]
                            uppercase
                            tracking-[0.2em]
                            [text-shadow:0_2px_5px_rgba(0,0,0,0.7)]
                            transition-opacity
                            hover:opacity-70
                            sm:text-xs
                        "
                    >
                        {item}
                    </button>
                ))}
            </nav>
        </main>
    )
}

export default Landing
