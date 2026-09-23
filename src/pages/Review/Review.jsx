import { useEffect, useState } from "react"
import {
    ArrowLeft,
    Camera as CameraIcon,
    Eye,
    RefreshCw,
    RotateCcw,
    X,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import kasukabeBg from "../../assets/kasukabe_bg.jpg"
import CameraComponent from "../../components/Camera/Camera"

import {
    getPhotos,
    savePhotos,
} from "../../utils/photoStore"

function Review() {
    const navigate = useNavigate()

    const [selectedPhotos, setSelectedPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCamera, setShowCamera] = useState(true)
    const [viewingPhoto, setViewingPhoto] = useState(null)

    useEffect(() => {
        let mounted = true

        const loadSavedPhotos = async () => {
            try {
                const savedPhotos = await getPhotos()

                if (mounted) {
                    setSelectedPhotos(savedPhotos)
                }
            } catch (error) {
                console.error("Unable to load saved photos:", error)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadSavedPhotos()

        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        if (loading) return

        savePhotos(selectedPhotos).catch((error) => {
            console.error("Unable to save photos:", error)
        })
    }, [selectedPhotos, loading])

    const handleCameraCapture = (photo) => {
        setSelectedPhotos((currentPhotos) => {
            if (currentPhotos.length >= 4) {
                return currentPhotos
            }

            return [
                ...currentPhotos,
                {
                    ...photo,
                    id: `photo-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`,
                },
            ]
        })
    }

    const handleRemovePhoto = (indexToRemove) => {
        setSelectedPhotos((currentPhotos) => {
            const photoToRemove = currentPhotos[indexToRemove]

            if (photoToRemove?.preview) {
                URL.revokeObjectURL(photoToRemove.preview)
            }

            return currentPhotos.filter(
                (_, index) => index !== indexToRemove
            )
        })
    }

    const handleRetake = (indexToRetake) => {
        setSelectedPhotos((currentPhotos) => {
            const photoToRetake = currentPhotos[indexToRetake]

            if (photoToRetake?.preview) {
                URL.revokeObjectURL(photoToRetake.preview)
            }

            return currentPhotos.filter(
                (_, index) => index !== indexToRetake
            )
        })

        setViewingPhoto(null)
        setShowCamera(true)
    }

    const handleBackToPhotobooth = () => {
        setShowCamera(false)
        navigate("/select")
    }

    const handleMakeStrip = () => {
        if (selectedPhotos.length < 2) return

        navigate("/make-strip")
    }

    const renderCameraControls = ({
        cameraReady,
        startCountdown,
        photoCount,
        flipCamera,
    }) => (
        <>
            {/* ───────────────── Desktop camera controls ───────────────── */}

            <div
                className="
                pointer-events-auto
                absolute
                right-0
                top-1/2
                z-30
                hidden
                -translate-y-1/2
                flex-col
                items-center
                gap-3
                sm:flex
                lg:right-2
            "
            >
                {/* Take photo */}

                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={startCountdown}
                        disabled={
                            !cameraReady ||
                            photoCount >= 4
                        }
                        className="
                        flex
                        h-[78px]
                        w-[78px]
                        items-center
                        justify-center
                        rounded-full
                        border-[4px]
                        border-white
                        bg-white/25
                        text-[#45342d]
                        shadow-[0_8px_28px_rgba(69,52,45,0.15)]
                        backdrop-blur-md
                        transition
                        hover:scale-105
                        hover:bg-white/40
                        active:scale-95
                        disabled:opacity-40
                    "
                        aria-label="Take photo"
                    >
                        <CameraIcon
                            size={28}
                            strokeWidth={1.5}
                        />
                    </button>

                    <span className="
                    mt-1.5
                    font-serif
                    text-[9px]
                    tracking-[0.12em]
                    text-[#45342d]
                ">
                        Take Photo
                    </span>
                </div>

                {/* Flip camera */}

                <div className="flex flex-col items-center">
                    <button
                        type="button"
                        onClick={flipCamera}
                        disabled={!cameraReady}
                        className="
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/50
                        bg-white/25
                        text-[#45342d]
                        backdrop-blur-md
                        transition
                        hover:bg-white/40
                        active:scale-90
                        disabled:opacity-40
                    "
                        aria-label="Flip camera"
                    >
                        <RefreshCw
                            size={17}
                            strokeWidth={1.5}
                        />
                    </button>

                    <span className="
                    mt-1
                    font-serif
                    text-[9px]
                    tracking-[0.12em]
                    text-[#45342d]/75
                ">
                        Flip
                    </span>
                </div>
            </div>


            {/* ───────────────── Mobile camera controls ───────────────── */}

            <div
                className="
                pointer-events-auto
                absolute
                left-1/2
                top-[calc(54vw+22px)]
                z-30
                flex
                -translate-x-1/2
                items-center
                justify-center
                gap-2
                sm:hidden
            "
            >
                {/* Take photo */}

                <button
                    type="button"
                    onClick={startCountdown}
                    disabled={
                        !cameraReady ||
                        photoCount >= 4
                    }
                    className="
                    flex
                    h-14
                    w-14
                    items-center
                    justify-center
                    rounded-full
                    border-[3px]
                    border-white
                    bg-white/25
                    text-[#45342d]
                    shadow-[0_6px_20px_rgba(69,52,45,0.12)]
                    backdrop-blur-md
                    transition
                    active:scale-95
                    disabled:opacity-40
                "
                    aria-label="Take photo"
                >
                    <CameraIcon
                        size={21}
                        strokeWidth={1.5}
                    />
                </button>

                {/* Flip camera */}

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
                    border-white/45
                    bg-white/25
                    text-[#45342d]
                    backdrop-blur-md
                    transition
                    hover:bg-white/40
                    active:scale-90
                    disabled:opacity-40
                "
                    aria-label="Flip camera"
                >
                    <RefreshCw
                        size={15}
                        strokeWidth={1.5}
                    />
                </button>
            </div>
        </>
    )

    if (loading) {
        return (
            <main className="flex h-screen items-center justify-center bg-[#fff8e8]">
                <p className="font-serif text-xs uppercase tracking-[0.25em] text-[#45342d]">
                    Loading your memories...
                </p>
            </main>
        )
    }

    return (
        <main className="relative h-screen w-full overflow-hidden">
            <img
                src={kasukabeBg}
                alt=""
                aria-hidden="true"
                className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    scale-105
                    object-cover
                    object-center
                "
            />

            <div className="absolute inset-0 bg-white/15" />

            <section className="relative z-20 flex h-screen w-full items-center justify-center p-3 sm:p-5 lg:p-8">
                {/* Mobile editorial banner */}
                <div
                    className="
        pointer-events-none
        absolute
        left-5
        right-5
        top-5
        z-30
        flex
        items-start
        justify-between
        lg:hidden
    "
                >
                    <p
                        className="
            max-w-[85px]
            text-left
            font-serif
            text-[7px]
            font-medium
            uppercase
            leading-[1.45]
            tracking-[0.16em]
            text-white
            [text-shadow:0_2px_5px_rgba(0,0,0,0.45)]
        "
                    >
                        A PHOTOBOOTH
                        <br />
                        FROM KASUKABE
                    </p>

                    <p
                        className="
            max-w-[70px]
            text-right
            font-serif
            text-[7px]
            font-medium
            uppercase
            leading-[1.45]
            tracking-[0.16em]
            text-white
            [text-shadow:0_2px_5px_rgba(0,0,0,0.45)]
        "
                    >
                        MADE FOR
                        <br />
                        MEMORIES ♡
                    </p>
                </div>
                <div
                    className="
                        relative
                        flex
                       h-auto
max-h-[calc(100vh-2rem)]
w-[calc(100%-2rem)]
                        max-w-[1180px]
                        flex-col
                        overflow-hidden
                        rounded-[28px]
                        border
                        border-white/55
                        bg-white/[0.20]
                        shadow-[0_20px_80px_rgba(69,52,45,0.16)]
                        backdrop-blur-2xl
                        sm:h-[calc(100vh-2.5rem)]
                        sm:w-[calc(100%-2rem)]
                        lg:h-[calc(100vh-4rem)]
                    "
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-px bg-white/90" />

                    {/* Header */}
                    <header className="relative z-40 flex shrink-0 items-center justify-between px-4 py-3 sm:px-7 sm:py-4">
                        <button
                            type="button"
                            onClick={handleBackToPhotobooth}
                            className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-full
                                border
                                border-white/55
                                bg-white/30
                                text-[#45342d]
                                shadow-sm
                                backdrop-blur-md
                                transition
                                hover:bg-white/50
                                active:scale-90
                                sm:h-10
                                sm:w-10
                            "
                            aria-label="Back to photobooth"
                        >
                            <ArrowLeft
                                size={17}
                                strokeWidth={1.5}
                            />
                        </button>

                        <p className="hidden text-right font-serif text-[9px] uppercase leading-[1.5] tracking-[0.18em] text-[#45342d]/60 sm:block">
                            Made for<br />
                            memories ♡
                        </p>

                        <div className="w-9 sm:hidden" />
                    </header>

                    {/* Camera stage */}
                    <div
                        className="
                            relative
                            flex
                            h-[370px]
                            shrink-0
                            items-start
                            justify-center
                            px-2
                            sm:h-auto
                            sm:min-h-0
                            sm:flex-1
                            sm:items-center
                            sm:px-8
                            lg:px-16
                        "
                    >
                        <div className="relative h-full w-full max-w-5xl">
                            {showCamera ? (
                                <CameraComponent
                                    embedded
                                    photoCount={selectedPhotos.length}
                                    onCapture={handleCameraCapture}
                                    onClose={() =>
                                        setShowCamera(false)
                                    }
                                    onReview={() =>
                                        setShowCamera(false)
                                    }
                                    renderControls={
                                        renderCameraControls
                                    }
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowCamera(true)
                                        }
                                        disabled={
                                            selectedPhotos.length >= 4
                                        }
                                        className="
                                            rounded-full
                                            border
                                            border-white/60
                                            bg-white/30
                                            px-6
                                            py-2.5
                                            font-serif
                                            text-xs
                                            uppercase
                                            tracking-[0.18em]
                                            text-[#45342d]
                                            backdrop-blur-md
                                            transition
                                            hover:bg-white/45
                                            active:scale-95
                                            disabled:opacity-40
                                        "
                                    >
                                        Open Camera
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Photo tray */}
                    <div className="relative z-40 flex shrink-0 justify-center px-3 pb-2 pt-1 sm:pb-3 sm:pt-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {selectedPhotos.map(
                                (photo, index) => (
                                    <div
                                        key={photo.id}
                                        className="group relative"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setViewingPhoto(
                                                    photo
                                                )
                                            }
                                            className="
                                                relative
                                                h-[60px]
                                                w-[46px]
                                                overflow-hidden
                                                rounded-lg
                                                border
                                                border-white/70
                                                bg-white/20
                                                shadow-[0_5px_18px_rgba(69,52,45,0.12)]
                                                transition
                                                hover:-translate-y-1
                                                sm:h-[76px]
                                                sm:w-[58px]
                                            "
                                        >
                                            <img
                                                src={photo.preview}
                                                alt={`Memory ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />

                                            <span className="absolute bottom-0 left-0 right-0 bg-black/30 py-0.5 text-[7px] text-white">
                                                {index + 1}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemovePhoto(
                                                    index
                                                )
                                            }
                                            className="
                                                absolute
                                                -right-1.5
                                                -top-1.5
                                                z-20
                                                flex
                                                h-5
                                                w-5
                                                items-center
                                                justify-center
                                                rounded-full
                                                border
                                                border-white/70
                                                bg-black/35
                                                text-white
                                                backdrop-blur-md
                                                transition
                                                hover:bg-black/60
                                                active:scale-90
                                            "
                                            aria-label={`Delete photo ${index + 1}`}
                                        >
                                            <X
                                                size={9}
                                                strokeWidth={2}
                                            />
                                        </button>

                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/25 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewingPhoto(
                                                        photo
                                                    )
                                                }
                                                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/50 bg-white/25 text-white backdrop-blur-md"
                                                aria-label="View photo"
                                            >
                                                <Eye
                                                    size={11}
                                                    strokeWidth={1.5}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRetake(
                                                        index
                                                    )
                                                }
                                                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/50 bg-white/25 text-white backdrop-blur-md"
                                                aria-label="Retake photo"
                                            >
                                                <RotateCcw
                                                    size={11}
                                                    strokeWidth={1.5}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}

                            {selectedPhotos.length < 4 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCamera(true)
                                    }
                                    className="
                                        flex
                                        h-[60px]
                                        w-[46px]
                                        items-center
                                        justify-center
                                        rounded-lg
                                        border
                                        border-dashed
                                        border-white/70
                                        bg-white/10
                                        font-serif
                                        text-lg
                                        text-[#45342d]/60
                                        backdrop-blur-md
                                        transition
                                        hover:bg-white/25
                                        active:scale-95
                                        sm:h-[76px]
                                        sm:w-[58px]
                                    "
                                    aria-label="Add another photo"
                                >
                                    +
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom actions */}
                    <footer
                        className="
    relative
    z-40
    flex
    shrink-0
    flex-col
    items-center
    justify-center
    gap-2
    px-3
    pb-4
    pt-2
    sm:flex-row
    sm:gap-3
    sm:pb-5
    sm:pt-3
"
                    >
                        <button
                            type="button"
                            onClick={
                                handleBackToPhotobooth
                            }
                            className="
    w-[240px]
    rounded-full
    border
    border-white/60
    bg-white/55
    px-4
    py-2.5
    font-serif
    text-[10px]
    uppercase
    tracking-[0.16em]
    text-[#45342d]
    shadow-[0_5px_20px_rgba(69,52,45,0.08)]
    backdrop-blur-md
    transition
    hover:bg-white/75
    active:scale-95
    sm:w-auto
    sm:px-7
    sm:text-xs
"
                        >
                            ← Back
                        </button>

                        <button
                            type="button"
                            onClick={handleMakeStrip}
                            disabled={
                                selectedPhotos.length < 2
                            }
                            className="
                                w-[240px]
                                rounded-full
                                border
                                border-white/50
                                bg-[#a99d92]/55
                                px-4
                                py-2.5
                                font-serif
                                text-[10px]
                                uppercase
                                tracking-[0.18em]
                                text-white
                                shadow-[0_6px_20px_rgba(69,52,45,0.12)]
                                backdrop-blur-md
                                transition-all
                                hover:bg-[#a99d92]/70
                                active:scale-95
                                disabled:cursor-not-allowed
                                disabled:opacity-35
                                sm:w-auto
                                sm:px-8
                                sm:text-xs
                            "
                        >
                            Make My Strip ✦
                        </button>
                    </footer>
                </div>
            </section>

            {/* Full photo viewer */}
            {viewingPhoto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-5 backdrop-blur-lg"
                    onClick={() =>
                        setViewingPhoto(null)
                    }
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw] rounded-[24px] border border-white/50 bg-white/20 p-2 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <img
                            src={viewingPhoto.preview}
                            alt="Selected memory"
                            className="max-h-[84vh] max-w-[85vw] rounded-[18px] object-contain"
                        />

                        <button
                            type="button"
                            onClick={() =>
                                setViewingPhoto(null)
                            }
                            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50 active:scale-90"
                            aria-label="Close photo"
                        >
                            <X
                                size={17}
                                strokeWidth={1.5}
                            />
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Review
