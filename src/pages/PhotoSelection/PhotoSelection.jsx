import { useEffect, useState } from "react"
import { Camera, Images, X, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

import photoboothBg from "../../assets/Kasukabe_photobooth.png"

import {
    savePhotos,
    getPhotos,
    clearPhotos,
} from "../../utils/photoStore"

function PhotoSelection() {
    const navigate = useNavigate()

    const [selectedPhotos, setSelectedPhotos] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadSavedPhotos = async () => {
            try {
                const savedPhotos = await getPhotos()
                setSelectedPhotos(savedPhotos)
            } catch (error) {
                console.error("Unable to load saved photos:", error)
            } finally {
                setLoading(false)
            }
        }

        loadSavedPhotos()
    }, [])

    useEffect(() => {
        if (loading) return

        savePhotos(selectedPhotos).catch((error) => {
            console.error("Unable to save photos:", error)
        })
    }, [selectedPhotos, loading])

    const removePhoto = (indexToRemove) => {
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

    const handleGalleryUpload = (event) => {
        const files = Array.from(event.target.files || [])

        if (files.length === 0) return

        setSelectedPhotos((currentPhotos) => {
            const remainingSlots = 4 - currentPhotos.length

            if (remainingSlots <= 0) {
                return currentPhotos
            }

            const newPhotos = files
                .slice(0, remainingSlots)
                .map((file) => ({
                    id: `photo-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`,
                    file,
                    preview: URL.createObjectURL(file),
                }))

            return [...currentPhotos, ...newPhotos]
        })

        event.target.value = ""
    }

    const handleCamera = async () => {
        try {
            await savePhotos(selectedPhotos)
            navigate("/review")
        } catch (error) {
            console.error("Unable to save photos:", error)
        }
    }

    const handleMakeStrip = async () => {
        if (selectedPhotos.length < 2) return

        try {
            await savePhotos(selectedPhotos)
            navigate("/make-strip")
        } catch (error) {
            console.error("Unable to save photos:", error)
        }
    }

    const handleBack = async () => {
        try {
            await clearPhotos()
        } catch (error) {
            console.error("Unable to clear photos:", error)
        }

        selectedPhotos.forEach((photo) => {
            if (photo.preview) {
                URL.revokeObjectURL(photo.preview)
            }
        })

        navigate("/")
    }

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
        <main className="relative h-screen w-full overflow-hidden bg-black">

            {/* Background */}
            <img
                src={photoboothBg}
                alt="Kasukabe photobooth"
                className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                    object-center
                "
            />

            <div className="absolute inset-0 bg-black/10" />

            {/* Main content */}
            <section className="relative z-10 min-h-screen">

                <div
                    className="
                        absolute
                        bottom-16
                        left-1/2
                        w-[calc(100%-2rem)]
                        max-w-2xl
                        -translate-x-1/2
                        overflow-hidden
                        rounded-[26px]
                        border
                        border-white/40
                        bg-white/[0.16]
                        px-5
                        pb-5
                        pt-18
                        text-center
                        shadow-[0_15px_50px_rgba(0,0,0,0.18)]
                        backdrop-blur-xl
                        sm:bottom-15
                        sm:px-8
                        sm:py-5
                    "
                >

                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70" />

                    {/* Heading */}
                    <p
                        className="
                            font-serif
                            text-xs
                            uppercase
                            tracking-[0.25em]
                            text-white
                            [text-shadow:0_2px_5px_rgba(0,0,0,0.5)]
                            sm:text-sm
                        "
                    >
                        How do you want to snap?
                    </p>

                    <p
                        className="
                            mt-1
                            font-serif
                            text-xs
                            italic
                            text-white/75
                            [text-shadow:0_2px_4px_rgba(0,0,0,0.45)]
                        "
                    >
                        Choose your way to make a memory
                    </p>

                    {/* Camera + Gallery */}
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">

                        {/* Gallery upload */}
                        <input
                            id="gallery-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleGalleryUpload}
                        />

                        {/* Camera */}
                        <button
                            type="button"
                            onClick={handleCamera}
                            disabled={selectedPhotos.length >= 4}
                            className="
                                group
                                flex
                                items-center
                                justify-center
                                gap-3
                                rounded-2xl
                                border
                                border-white/30
                                bg-white/[0.08]
                                px-4
                                py-3
                                text-white
                                backdrop-blur-md
                                transition-all
                                duration-300
                                hover:border-white/50
                                hover:bg-white/[0.16]
                                active:scale-[0.98]
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                            "
                        >
                            <Camera
                                size={20}
                                strokeWidth={1.5}
                            />

                            <span className="text-left">
                                <span
                                    className="
                                        block
                                        font-serif
                                        text-xs
                                        uppercase
                                        tracking-[0.16em]
                                        [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]
                                    "
                                >
                                    Camera
                                </span>

                                <span className="mt-0.5 block text-[10px] text-white/70">
                                    Take a photo
                                </span>
                            </span>
                        </button>

                        {/* Gallery */}
                        <button
                            type="button"
                            onClick={() =>
                                document
                                    .getElementById("gallery-upload")
                                    ?.click()
                            }
                            disabled={selectedPhotos.length >= 4}
                            className="
                                group
                                flex
                                items-center
                                justify-center
                                gap-3
                                rounded-2xl
                                border
                                border-white/30
                                bg-white/[0.08]
                                px-4
                                py-3
                                text-white
                                backdrop-blur-md
                                transition-all
                                duration-300
                                hover:border-white/50
                                hover:bg-white/[0.16]
                                active:scale-[0.98]
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                            "
                        >
                            <Images
                                size={20}
                                strokeWidth={1.5}
                            />

                            <span className="text-left">
                                <span
                                    className="
                                        block
                                        font-serif
                                        text-xs
                                        uppercase
                                        tracking-[0.16em]
                                        [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]
                                    "
                                >
                                    Gallery
                                </span>

                                <span className="mt-0.5 block text-[10px] text-white/70">
                                    Choose your photos (Max 4)
                                </span>
                            </span>
                        </button>

                    </div>

                    {/* Selected photos */}
                    {selectedPhotos.length > 0 && (
                        <div className="mt-5">

                            <p
                                className="
                                    mb-3
                                    font-serif
                                    uppercase
                                    tracking-[0.2em]
                                    text-white
                                    [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]
                                "
                            >
                                {selectedPhotos.length} photo
                                {selectedPhotos.length > 1 ? "s" : ""} selected
                            </p>

                            <div className="flex justify-center gap-2">

                                {selectedPhotos.map((photo, index) => (
                                    <div
                                        key={photo.id}
                                        className="relative"
                                    >
                                        <img
                                            src={photo.preview}
                                            alt={`Selected ${index + 1}`}
                                            className="
                                                h-16
                                                w-12
                                                rounded-lg
                                                border
                                                border-white/40
                                                object-cover
                                                shadow-[0_4px_15px_rgba(0,0,0,0.2)]
                                            "
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removePhoto(index)
                                            }
                                            aria-label={`Remove photo ${index + 1}`}
                                            className="
                                                absolute
                                                -right-2
                                                -top-2
                                                flex
                                                h-5
                                                w-5
                                                items-center
                                                justify-center
                                                rounded-full
                                                border
                                                border-white/60
                                                bg-black/30
                                                text-white
                                                shadow-sm
                                                backdrop-blur-md
                                                transition-all
                                                hover:bg-black/50
                                                active:scale-90
                                            "
                                        >
                                            <X
                                                size={11}
                                                strokeWidth={2}
                                            />
                                        </button>

                                    </div>
                                ))}

                            </div>
                        </div>
                    )}

                    {/* Make My Strip */}
                    <button
                        type="button"
                        onClick={handleMakeStrip}
                        disabled={selectedPhotos.length < 2}
                        className="
                            mt-6
                            rounded-full
                            border
                            border-white/40
                            bg-white/15
                            px-7
                            py-2.5
                            font-serif
                            text-xs
                            uppercase
                            tracking-[0.25em]
                            text-white
                            shadow-[0_5px_25px_rgba(0,0,0,0.12)]
                            backdrop-blur-md
                            transition-all
                            duration-300
                            hover:bg-white/25
                            hover:tracking-[0.3em]
                            active:scale-95
                            disabled:cursor-not-allowed
                            disabled:opacity-35
                        "
                    >
                        Make My Strip ✦
                    </button>

                    <p className="mt-2 text-center text-xs text-white/60">
                        Minimum 2 photos required
                    </p>

                    {/* Back */}
                    <button
                        type="button"
                        onClick={handleBack}
                        aria-label="Back"
                        className="
                            absolute
                            left-5
                            top-5
                            z-20
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-full
                            border
                            border-white/25
                            bg-white/10
                            text-white
                            shadow-[0_4px_18px_rgba(0,0,0,0.12)]
                            backdrop-blur-md
                            transition-all
                            duration-300
                            hover:bg-white/20
                            hover:-translate-x-0.5
                            active:scale-90
                        "
                    >
                        <ArrowLeft
                            size={18}
                            strokeWidth={1.5}
                        />
                    </button>

                </div>
            </section>
        </main>
    )
}

export default PhotoSelection