import { useEffect, useRef, useState } from "react"
import {
    Camera as CameraIcon,
    X,
    RefreshCw,
} from "lucide-react"

function Camera({
    onCapture,
    onClose,
    onReview,
    photoCount,
    embedded = false,
    renderControls,
}) {
    const videoRef = useRef(null)
    const captureCanvasRef = useRef(null)
    const streamRef = useRef(null)
    const captureLockRef = useRef(false)

    const [cameraError, setCameraError] = useState("")
    const [countdown, setCountdown] = useState(null)
    const [cameraReady, setCameraReady] = useState(false)
    const [facingMode, setFacingMode] = useState("user")

    /*
     * ─────────────────────────────────────────────
     * Start / restart camera whenever facing mode changes
     * ─────────────────────────────────────────────
     */

    useEffect(() => {
        let mounted = true

        const startCamera = async () => {
            try {
                setCameraError("")
                setCameraReady(false)

                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error(
                        "Your browser does not support camera access."
                    )
                }

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: {
                                ideal: facingMode,
                            },
                        },
                        audio: false,
                    })

                if (!mounted) {
                    stream
                        .getTracks()
                        .forEach((track) => track.stop())

                    return
                }

                streamRef.current = stream

                const video = videoRef.current

                if (!video) {
                    throw new Error(
                        "Camera preview could not be created."
                    )
                }

                video.srcObject = stream

                await video.play()

                if (mounted) {
                    setCameraReady(true)
                }
            } catch (error) {
                console.error("Camera failed:", error)

                if (mounted) {
                    setCameraReady(false)

                    if (
                        error?.name ===
                        "NotAllowedError"
                    ) {
                        setCameraError(
                            "Camera permission was denied."
                        )
                    } else if (
                        error?.name ===
                        "NotFoundError"
                    ) {
                        setCameraError(
                            "No camera was found on this device."
                        )
                    } else {
                        setCameraError(
                            error?.message ||
                            "Camera could not start."
                        )
                    }
                }
            }
        }

        startCamera()

        return () => {
            mounted = false

            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop())

                streamRef.current = null
            }

            if (videoRef.current) {
                videoRef.current.srcObject = null
            }
        }
    }, [facingMode])

    /*
     * ─────────────────────────────────────────────
     * Flip camera
     * ─────────────────────────────────────────────
     */

    const flipCamera = () => {
        if (!cameraReady || countdown !== null) {
            return
        }

        setCameraReady(false)

        setFacingMode((currentMode) =>
            currentMode === "user"
                ? "environment"
                : "user"
        )
    }

    /*
     * ─────────────────────────────────────────────
     * Countdown
     * ─────────────────────────────────────────────
     */

    const startCountdown = () => {
        if (
            captureLockRef.current ||
            countdown !== null ||
            !cameraReady ||
            photoCount >= 4
        ) {
            return
        }

        captureLockRef.current = true

        let current = 3

        setCountdown(current)

        const timer = setInterval(() => {
            current -= 1

            if (current === 0) {
                clearInterval(timer)

                setCountdown(null)

                capturePhoto()

                return
            }

            setCountdown(current)
        }, 1000)
    }

    /*
     * ─────────────────────────────────────────────
     * Capture current video frame
     * ─────────────────────────────────────────────
     */

    const capturePhoto = () => {
        const video = videoRef.current
        const canvas = captureCanvasRef.current

        if (
            !video ||
            !canvas ||
            !video.videoWidth ||
            !video.videoHeight
        ) {
            console.error(
                "Camera frame is not available."
            )

            captureLockRef.current = false

            return
        }

        const width = video.videoWidth
        const height = video.videoHeight

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext("2d")

        if (!context) {
            console.error(
                "Could not create capture canvas context."
            )

            captureLockRef.current = false

            return
        }

        context.clearRect(
            0,
            0,
            width,
            height
        )

        /*
         * Front camera:
         * mirror the captured image so it matches
         * what the user sees in the preview.
         *
         * Back camera:
         * capture normally.
         */

        context.save()

        if (facingMode === "user") {
            context.translate(width, 0)
            context.scale(-1, 1)
        }

        context.drawImage(
            video,
            0,
            0,
            width,
            height
        )

        context.restore()

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    captureLockRef.current = false
                    return
                }

                const photo = {
                    file: blob,
                    preview: URL.createObjectURL(blob),
                }

                onCapture(photo)

                captureLockRef.current = false
            },
            "image/jpeg",
            0.92
        )
    }

    /*
     * ─────────────────────────────────────────────
     * Default controls
     * ─────────────────────────────────────────────
     */

    const renderDefaultControls = ({
        cameraReady,
        startCountdown,
        photoCount,
        flipCamera,
    }) => (
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">

            <div className="
                rounded-full
                border
                border-white/25
                bg-black/20
                px-3
                py-1.5
                text-[9px]
                text-white
                backdrop-blur-md
            ">
                {photoCount} / 4
            </div>

            <button
                type="button"
                onClick={startCountdown}
                disabled={
                    !cameraReady ||
                    photoCount >= 4
                }
                className="
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-full
                    border-4
                    border-white/80
                    bg-white/15
                    text-white
                    backdrop-blur-md
                    transition
                    hover:bg-white/25
                    active:scale-95
                    disabled:opacity-40
                "
                aria-label="Take photo"
            >
                <CameraIcon
                    size={24}
                    strokeWidth={1.5}
                />
            </button>

            <button
                type="button"
                onClick={flipCamera}
                disabled={!cameraReady}
                className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/30
                    bg-white/10
                    text-white
                    backdrop-blur-md
                    transition
                    hover:bg-white/20
                    active:scale-95
                    disabled:opacity-40
                "
                aria-label="Flip camera"
            >
                <RefreshCw
                    size={16}
                    strokeWidth={1.5}
                />
            </button>

        </div>
    )

    return (
        <div
            className={
                embedded
                    ? "relative h-full w-full"
                    : "fixed inset-0 z-50 bg-black"
            }
        >

            {/* ───────────────── Camera frame ───────────────── */}

            <div
                className={
                    embedded
                        ? `
                            absolute
                            left-1/2
                            top-3
                            aspect-[4/3]
                            w-[min(72vw,300px)]
                            -translate-x-1/2
                            overflow-hidden
                            rounded-[22px]
                            border-[4px]
                            border-white/80
                            bg-black
                            shadow-[0_12px_45px_rgba(69,52,45,0.18)]
                            sm:top-1/2
                            sm:h-[min(68vh,520px)]
                            sm:w-auto
                            sm:-translate-x-1/2
                            sm:-translate-y-1/2
                        `
                        : `
                            absolute
                            inset-0
                            overflow-hidden
                            bg-black
                        `
                }
            >

                {/* Camera preview */}

                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`
                        absolute
                        inset-0
                        h-full
                        w-full
                        object-cover
                        ${facingMode === "user"
                            ? "scale-x-[-1]"
                            : ""
                        }
                    `}
                />

                {/* Hidden capture canvas */}

                <canvas
                    ref={captureCanvasRef}
                    className="hidden"
                />

                {/* Soft overlay */}

                <div className="
                    pointer-events-none
                    absolute
                    inset-0
                    bg-black/5
                " />

                {/* Camera title */}

                <div className="
                    absolute
                    left-1/2
                    top-4
                    z-40
                    -translate-x-1/2
                    rounded-full
                    border
                    border-white/20
                    bg-black/15
                    px-4
                    py-1.5
                    backdrop-blur-md
                ">
                    <p className="
                        whitespace-nowrap
                        font-serif
                        text-[9px]
                        uppercase
                        tracking-[0.28em]
                        text-white
                        [text-shadow:0_2px_5px_rgba(0,0,0,0.4)]
                    ">
                        Kasukabe Cam
                    </p>
                </div>

                {/* Close button */}

                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            absolute
                            right-4
                            top-4
                            z-50
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-white/25
                            bg-black/20
                            text-white
                            backdrop-blur-md
                            transition
                            hover:bg-black/35
                            active:scale-95
                        "
                        aria-label="Close camera"
                    >
                        <X
                            size={18}
                            strokeWidth={1.5}
                        />
                    </button>
                )}

                {/* Camera error */}

                {cameraError && (
                    <div className="
                        absolute
                        inset-x-4
                        top-1/2
                        z-50
                        -translate-y-1/2
                        rounded-2xl
                        border
                        border-white/30
                        bg-black/40
                        px-5
                        py-5
                        text-center
                        text-white
                        backdrop-blur-xl
                    ">
                        <p className="font-serif text-sm">
                            {cameraError}
                        </p>

                        <p className="
                            mt-2
                            text-xs
                            text-white/60
                        ">
                            Please allow camera access
                            in your browser settings.
                        </p>
                    </div>
                )}

                {/* Countdown */}

                {countdown !== null && (
                    <div className="
                        pointer-events-none
                        absolute
                        inset-0
                        z-[60]
                        flex
                        items-center
                        justify-center
                    ">
                        <div className="
                            flex
                            h-28
                            w-28
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-white/50
                            bg-white/10
                            font-serif
                            text-6xl
                            text-white
                            shadow-[0_10px_40px_rgba(0,0,0,0.2)]
                            backdrop-blur-md
                            [text-shadow:0_3px_12px_rgba(0,0,0,0.5)]
                        ">
                            {countdown}
                        </div>
                    </div>
                )}

            </div>

            {/* ───────────────── Controls ───────────────── */}

            {!cameraError &&
                countdown === null &&
                (
                    renderControls
                        ? renderControls({
                            cameraReady,
                            startCountdown,
                            photoCount,
                            flipCamera,
                            onReview,
                        })
                        : renderDefaultControls({
                            cameraReady,
                            startCountdown,
                            photoCount,
                            flipCamera,
                            onReview,
                        })
                )
            }

        </div>
    )
}

export default Camera