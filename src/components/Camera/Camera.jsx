import { useEffect, useRef, useState } from "react"
import {
    Camera as CameraIcon,
    RotateCcw,
    Sparkles,
    Palette,
    ScanFace,
} from "lucide-react"
import {
    bootstrapCameraKit,
    createMediaStreamSource,
    Transform2D,
} from "@snap/camera-kit"

const LENS_OPTIONS = [
    {
        id: null,
        label: "Original",
        icon: Sparkles,
    },
    {
        id: "a4d4f38d-66ea-42aa-b681-ed225e26ddbc",
        label: "Beauty",
        icon: Sparkles,
    },
    {
        id: "d84e5da6-b901-46ab-83f4-e11492a2c3e6",
        label: "Rosy",
        icon: Palette,
    },
    {
        id: "a72a3a8b-f6b5-4639-b2da-7fe0c110127f",
        label: "Mono",
        icon: ScanFace,
    },
]

function Camera({
    onCapture,
    onClose,
    onReview,
    photoCount,
    embedded = false,
    renderControls,
}) {
    const liveCanvasRef = useRef(null)
    const sessionRef = useRef(null)
    const streamRef = useRef(null)
    const captureLockRef = useRef(false)

    const [cameraError, setCameraError] = useState("")
    const [lensError, setLensError] = useState("")
    const [countdown, setCountdown] = useState(null)
    const [cameraReady, setCameraReady] = useState(false)
    const [lenses, setLenses] = useState([])
    const [selectedLensId, setSelectedLensId] = useState(null)
    const [lensSwitching, setLensSwitching] = useState(false)

    useEffect(() => {
        let mounted = true

        const startCameraKit = async () => {
            try {
                const apiToken = import.meta.env.VITE_SNAP_API_TOKEN
                const lensGroupId = import.meta.env.VITE_SNAP_LENS_GROUP_ID

                console.log(
                    "🔑 Lens Group ID being used:",
                    lensGroupId
                )

                if (!apiToken || !lensGroupId) {
                    throw new Error(
                        "Snap Camera Kit environment variables are missing."
                    )
                }

                if (!liveCanvasRef.current) {
                    throw new Error(
                        "Camera canvas could not be created."
                    )
                }

                console.log("Starting Camera Kit...")

                const cameraKit = await bootstrapCameraKit({
                    apiToken,
                })

                if (!mounted) return

                const session = await cameraKit.createSession({
                    liveRenderTarget: liveCanvasRef.current,
                })

                if (!mounted) {
                    await session.pause()
                    return
                }

                sessionRef.current = session

                session.events.addEventListener(
    "error",
    (event) => {
        const error = event.detail?.error
        const lens = event.detail?.lens

        console.error(
            "🚨 CAMERA KIT LENS ERROR:",
            {
                name: error?.name,
                message: error?.message,
                lensName: lens?.name,
                lensId: lens?.id,
                fullError: error,
                fullEvent: event.detail,
            }
        )

        if (mounted) {
            const errorMessage =
                error?.message ||
                error?.name ||
                "That lens could not render."

            setLensError(errorMessage)

            setSelectedLensId(null)
        }
    }
)

                console.log("Camera Kit session created.")

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: "user",
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

                console.log("Camera stream acquired.")

                const source = createMediaStreamSource(
                    stream,
                    {
                        transform: Transform2D.MirrorX,
                        cameraType: "user",
                    }
                )

                await session.setSource(source)

                console.log("Camera source connected.")

                /*
                 * Load the Lens Group.
                 *
                 * Your current working group is returning all
                 * 26 lenses, including:
                 *
                 * - Rosy Monochrome
                 * - Rosy Glow Veil
                 * - Kasukabe Beauty
                 */

                const {
                    lenses: loadedLenses,
                    errors: lensLoadErrors,
                } =
                    await cameraKit.lensRepository.loadLensGroups(
                        [lensGroupId]
                    )

                console.log(
                    "🎭 Loaded lenses:",
                    loadedLenses
                )

                console.log(
                    "🎭 Lens loading errors:",
                    lensLoadErrors
                )

                if (
                    !loadedLenses ||
                    loadedLenses.length === 0
                ) {
                    console.error(
                        "❌ Lens group returned no lenses.",
                        {
                            lensGroupId,
                            lensLoadErrors,
                        }
                    )

                    throw new Error(
                        "No lenses were returned by this Camera Kit Lens Group."
                    )
                }

                /*
                 * Store the loaded lenses.
                 */
                setLenses(loadedLenses)

                window.__kasukabeLenses =
                    loadedLenses

                /*
                 * Useful debugging table.
                 */
                console.table(
                    loadedLenses.map((lens) => ({
                        id: lens.id,
                        groupId: lens.groupId,
                        name: lens.name,
                    }))
                )

                if (!mounted) return

                /*
                 * Start both live preview and capture.
                 */
                await session.play("live")
                await session.play("capture")

                console.log(
                    "Camera Kit live playback started."
                )

                if (mounted) {
                    setCameraReady(true)
                }
            } catch (error) {
                console.error(
                    "Camera Kit failed:",
                    error
                )

                if (mounted) {
                    setCameraError(
                        error?.message ||
                            "Camera Kit could not start."
                    )
                }
            }
        }

        startCameraKit()

        return () => {
            mounted = false

            if (sessionRef.current) {
                sessionRef.current.pause()
                sessionRef.current = null
            }

            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop())

                streamRef.current = null
            }
        }
    }, [])

    const changeLens = async (lensId) => {
        const session = sessionRef.current

        if (
            !session ||
            !cameraReady ||
            lensSwitching
        ) {
            return
        }

        setLensSwitching(true)
        setLensError("")

        try {
            /*
             * Original camera
             */
            if (lensId === null) {
                await session.removeLens()

                setSelectedLensId(null)

                console.log(
                    "Lens removed. Original camera active."
                )

                return
            }

            /*
             * Find the actual loaded Lens object
             * using its Lens ID.
             */
            const lens = lenses.find(
                (item) => item.id === lensId
            )

            if (!lens) {
                throw new Error(
                    `Lens ${lensId} was not found in the loaded Lens Group.`
                )
            }

            console.log(
                `Applying lens: ${lens.name} (${lens.id})`
            )

            await session.applyLens(lens)

            setSelectedLensId(lens.id)

            console.log(
                `✅ Lens applied successfully: ${lens.name}`
            )
        } catch (error) {
            console.error(
                "Lens switch failed:",
                error
            )

            try {
                await session.removeLens()
            } catch (removeError) {
                console.error(
                    "Could not remove failed lens:",
                    removeError
                )
            }

            setSelectedLensId(null)

            setLensError(
                "That lens could not be applied. Try another one."
            )
        } finally {
            setLensSwitching(false)
        }
    }

    const startCountdown = () => {
        if (
            captureLockRef.current ||
            countdown !== null ||
            !cameraReady ||
            lensSwitching ||
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

    const capturePhoto = () => {
        const session = sessionRef.current

        if (!session) {
            captureLockRef.current = false
            return
        }

        const canvas = session.output.capture

        if (!canvas) {
            console.error(
                "Capture canvas is unavailable."
            )

            captureLockRef.current = false

            return
        }

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

    const renderDefaultControls = ({
        selectedLensId,
        cameraReady,
        lensSwitching,
        changeLens,
        startCountdown,
        photoCount,
        onReview,
    }) => (
        <>
            {/* Lens selector */}
            <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/20 bg-black/20 p-1 backdrop-blur-xl">
                <div className="flex items-center gap-1">
                    {LENS_OPTIONS.map((option) => {
                        const Icon = option.icon

                        const isSelected =
                            selectedLensId === option.id

                        return (
                            <button
                                key={option.label}
                                type="button"
                                onClick={() =>
                                    changeLens(option.id)
                                }
                                disabled={
                                    !cameraReady ||
                                    lensSwitching
                                }
                                className={`flex h-14 w-14 flex-col items-center justify-center rounded-full text-white transition ${
                                    isSelected
                                        ? "bg-white/25"
                                        : "hover:bg-white/10"
                                } disabled:opacity-50`}
                            >
                                <Icon
                                    size={16}
                                    strokeWidth={1.5}
                                />

                                <span className="mt-1 text-[7px] uppercase tracking-[0.08em]">
                                    {option.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Capture controls */}
            <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
                <div className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[9px] text-white backdrop-blur-md">
                    {photoCount} / 4
                </div>

                <button
                    type="button"
                    onClick={startCountdown}
                    disabled={
                        !cameraReady ||
                        lensSwitching ||
                        photoCount >= 4
                    }
                    className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 active:scale-95 disabled:opacity-40"
                    aria-label="Take photo"
                >
                    <CameraIcon
                        size={24}
                        strokeWidth={1.5}
                    />
                </button>

                <button
                    type="button"
                    onClick={() => changeLens(null)}
                    disabled={
                        !cameraReady ||
                        lensSwitching ||
                        selectedLensId === null
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-40"
                    aria-label="Reset lens"
                >
                    <RotateCcw
                        size={16}
                        strokeWidth={1.5}
                    />
                </button>
            </div>
        </>
    )

    return (
        <div
            className={
                embedded
                    ? "relative h-full w-full"
                    : "fixed inset-0 z-50 bg-black"
            }
        >
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
                        : "absolute inset-0 overflow-hidden bg-black"
                }
            >
                <canvas
                    ref={liveCanvasRef}
                    className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="pointer-events-none absolute inset-0 bg-black/5" />

                <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-black/15 px-4 py-1.5 backdrop-blur-md">
                    <p className="whitespace-nowrap font-serif text-[9px] uppercase tracking-[0.28em] text-white [text-shadow:0_2px_5px_rgba(0,0,0,0.4)]">
                        Kasukabe Cam
                    </p>
                </div>

                {cameraError && (
                    <div className="absolute inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-white/30 bg-black/40 px-5 py-5 text-center text-white backdrop-blur-xl">
                        <p className="font-serif text-sm">
                            {cameraError}
                        </p>

                        <p className="mt-2 text-xs text-white/60">
                            Please check your Camera Kit
                            setup and camera permissions.
                        </p>
                    </div>
                )}

                {lensError &&
                    !cameraError &&
                    countdown === null && (
                        <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-black/25 px-4 py-2 text-xs text-white backdrop-blur-md">
                            {lensError}
                        </div>
                    )}

                {countdown !== null && (
                    <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center">
                        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/50 bg-white/10 font-serif text-6xl text-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] backdrop-blur-md [text-shadow:0_3px_12px_rgba(0,0,0,0.5)]">
                            {countdown}
                        </div>
                    </div>
                )}
            </div>

            {!cameraError &&
                countdown === null &&
                (renderControls
                    ? renderControls({
                          lenses,
                          selectedLensId,
                          cameraReady,
                          lensSwitching,
                          changeLens,
                          startCountdown,
                          photoCount,
                          onReview,
                      })
                    : renderDefaultControls({
                          selectedLensId,
                          cameraReady,
                          lensSwitching,
                          changeLens,
                          startCountdown,
                          photoCount,
                          onReview,
                      }))}
        </div>
    )
}

export default Camera