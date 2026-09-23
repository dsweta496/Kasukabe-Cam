import { useEffect, useMemo, useState } from "react"
import {
    ArrowLeft,
    Download,
    RefreshCw,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import kasukabeBg from "../../assets/kasukabe_bg.jpg"

import {
    FRAME_CATALOG,
    FRAME_WIDTH,
    FRAME_HEIGHT,
} from "../../data/frameCatalog"

import { getPhotos } from "../../utils/photoStore"


const DEFAULT_TRANSFORM = {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
}


function resolveFrameSrc(src) {
    const cleanPath =
        src.replace("./frames/", "")

    return new URL(
        `../../assets/frames/${cleanPath}`,
        import.meta.url,
    ).href
}


/*
 * Load an image and wait until it is ready.
 */
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const image = new Image()

        image.onload = () => resolve(image)
        image.onerror = reject

        image.src = src
    })
}


/*
 * Draw a photo exactly like the editor:
 *
 * - object-contain
 * - centered
 * - x/y pixel offset
 * - scale
 * - rotation
 */
const drawContainedImage = (
    context,
    image,
    x,
    y,
    width,
    height,
    transform = DEFAULT_TRANSFORM,
    transformScale = 1,
) => {
    const imageRatio =
        image.naturalWidth /
        image.naturalHeight

    const boxRatio =
        width / height

    let drawWidth
    let drawHeight

    if (imageRatio > boxRatio) {
        drawWidth = width
        drawHeight =
            width / imageRatio
    } else {
        drawHeight = height
        drawWidth =
            height * imageRatio
    }

    const centerX =
        x + width / 2

    const centerY =
        y + height / 2

    const offsetX =
        transform.x * transformScale

    const offsetY =
        transform.y * transformScale

    context.save()

    /*
     * ---------------------------------
     * CLIP PHOTO TO ITS FRAME SLOT
     * ---------------------------------
     *
     * MakeStrip.jsx uses an overflow-hidden
     * container around each photo slot.
     *
     * Canvas does not have that automatic
     * clipping, so we reproduce it here.
     *
     * Anything outside this rectangle will
     * be discarded, even when the photo is
     * scaled, moved, or rotated.
     */
    context.beginPath()

    context.rect(
        x,
        y,
        width,
        height,
    )

    context.clip()

    /*
     * Apply the user's photo transform
     * inside the clipped slot.
     */
    context.translate(
        centerX + offsetX,
        centerY + offsetY,
    )

    context.rotate(
        (transform.rotation *
            Math.PI) /
        180,
    )

    context.scale(
        transform.scale,
        transform.scale,
    )

    context.drawImage(
        image,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
    )

    context.restore()
}


function Result() {
    const navigate = useNavigate()

    const [photos, setPhotos] =
        useState([])

    const [selectedFrame, setSelectedFrame] =
        useState(null)

    const [photoTransforms, setPhotoTransforms] =
        useState([])

    const [stickers, setStickers] =
        useState([])

    const [previewUrl, setPreviewUrl] =
        useState(null)

    const [loading, setLoading] =
        useState(true)

    const [generating, setGenerating] =
        useState(false)

    const [error, setError] =
        useState("")


    /*
     * -----------------------------------------
     * LOAD STRIP DATA
     * -----------------------------------------
     */
    useEffect(() => {
        let mounted = true

        const loadResult = async () => {
            try {
                const savedDraft =
                    sessionStorage.getItem(
                        "kasukabe-strip-draft",
                    )

                if (!savedDraft) {
                    navigate(
                        "/make-strip",
                        { replace: true },
                    )

                    return
                }

                const draft =
                    JSON.parse(savedDraft)

                const savedPhotos =
                    await getPhotos()

                const savedStickers =
                    sessionStorage.getItem(
                        "kasukabe-strip-stickers",
                    )

                if (!mounted) return

                const frame =
                    FRAME_CATALOG.find(
                        (item) =>
                            item.id ===
                            draft.frameId,
                    )

                if (
                    !frame ||
                    savedPhotos.length === 0
                ) {
                    navigate(
                        "/make-strip",
                        { replace: true },
                    )

                    return
                }

                setPhotos(savedPhotos)

                setSelectedFrame(frame)

                setPhotoTransforms(
                    draft.photoTransforms ||
                    savedPhotos.map(() => ({
                        x: 0,
                        y: 0,
                        scale: 1.12,
                        rotation: 0,
                    })),
                )

                if (savedStickers) {
                    setStickers(
                        JSON.parse(
                            savedStickers,
                        ),
                    )
                }
            } catch (loadError) {
                console.error(
                    "Unable to load result:",
                    loadError,
                )

                if (mounted) {
                    setError(
                        "We couldn't prepare your strip.",
                    )
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadResult()

        return () => {
            mounted = false
        }
    }, [navigate])


    /*
     * -----------------------------------------
     * GENERATE FINAL 1012 × 1300 IMAGE
     * -----------------------------------------
     */
    const generateStrip = async () => {
        if (
            !selectedFrame ||
            photos.length === 0
        ) {
            return null
        }

        setGenerating(true)
        setError("")

        try {
            const canvas =
                document.createElement(
                    "canvas",
                )

            canvas.width = FRAME_WIDTH
            canvas.height = FRAME_HEIGHT

            const context =
                canvas.getContext("2d")

            if (!context) {
                throw new Error(
                    "Canvas is not supported.",
                )
            }


            /*
             * ---------------------------------
             * PHOTO TRANSFORM SCALE
             * ---------------------------------
             *
             * The editor's photo x/y values
             * are CSS pixels.
             *
             * We use 500px as the editor's
             * logical reference width.
             */
            const editorReferenceWidth = 500

            const transformScale =
                FRAME_WIDTH /
                editorReferenceWidth


            /*
             * ---------------------------------
             * PHOTOS
             * ---------------------------------
             */
            for (
                let index = 0;
                index <
                selectedFrame.slots.length;
                index += 1
            ) {
                const slot =
                    selectedFrame.slots[index]

                const photo =
                    photos[index]

                if (!photo) continue

                const transform =
                    photoTransforms[index] ||
                    DEFAULT_TRANSFORM

                const image =
                    await loadImage(
                        photo.preview,
                    )

                drawContainedImage(
                    context,
                    image,
                    slot.x,
                    slot.y,
                    slot.width,
                    slot.height,
                    transform,
                    transformScale,
                )
            }


            /*
             * ---------------------------------
             * FRAME
             * ---------------------------------
             */
            const frameImage =
                await loadImage(
                    resolveFrameSrc(
                        selectedFrame.src,
                    ),
                )

            context.drawImage(
                frameImage,
                0,
                0,
                FRAME_WIDTH,
                FRAME_HEIGHT,
            )


            /*
             * ---------------------------------
             * STICKERS
             * ---------------------------------
             *
             * IMPORTANT:
             *
             * Sticker x/y are percentages
             * of the strip canvas.
             *
             * Therefore:
             *
             * x = 0   → left edge
             * x = 50  → centre
             * x = 100 → right edge
             *
             * Same for y.
             *
             * We DO NOT alter these coordinates
             * depending on whether the sticker
             * is inside or outside the strip.
             */
            for (
                const sticker of stickers
            ) {
                if (!sticker?.src) {
                    continue
                }

                const image =
                    await loadImage(
                        sticker.src,
                    )


                /*
                 * Position directly in the
                 * original frame coordinate
                 * system.
                 */
                const centerX =
                    (sticker.x / 100) *
                    FRAME_WIDTH

                const centerY =
                    (sticker.y / 100) *
                    FRAME_HEIGHT


                /*
                 * Stickers are 100px wide in
                 * the editor's logical canvas.
                 *
                 * Convert that logical size
                 * into frame coordinates.
                 */
                const stickerSize =
                    sticker.sizePercent
                        ? (sticker.sizePercent / 100) *
                        FRAME_WIDTH
                        : 100 *
                        sticker.scale *
                        (FRAME_WIDTH / 500)


                context.save()

                /*
                 * This is the exact same
                 * centre-point behaviour used
                 * by Stickers.jsx.
                 */
                context.translate(
                    centerX,
                    centerY,
                )

                context.rotate(
                    (sticker.rotation *
                        Math.PI) /
                    180,
                )

                context.drawImage(
                    image,
                    -stickerSize / 2,
                    -stickerSize / 2,
                    stickerSize,
                    stickerSize,
                )

                context.restore()
            }


            /*
             * ---------------------------------
             * PNG
             * ---------------------------------
             */
            const blob =
                await new Promise(
                    (
                        resolve,
                        reject,
                    ) => {
                        canvas.toBlob(
                            (result) => {
                                if (result) {
                                    resolve(
                                        result,
                                    )
                                } else {
                                    reject(
                                        new Error(
                                            "Unable to create PNG.",
                                        ),
                                    )
                                }
                            },
                            "image/png",
                        )
                    },
                )


            const url =
                URL.createObjectURL(
                    blob,
                )

            return {
                blob,
                url,
            }
        } catch (generationError) {
            console.error(
                "Unable to generate strip:",
                generationError,
            )

            setError(
                "Something went wrong while creating your strip.",
            )

            return null
        } finally {
            setGenerating(false)
        }
    }


    /*
     * -----------------------------------------
     * PREPARE PREVIEW
     * -----------------------------------------
     */
    useEffect(() => {
        if (
            loading ||
            !selectedFrame ||
            photos.length === 0
        ) {
            return
        }

        let active = true
        let currentUrl = null

        const preparePreview = async () => {
            const result =
                await generateStrip()

            if (
                !active ||
                !result
            ) {
                return
            }

            currentUrl = result.url

            setPreviewUrl(
                result.url,
            )
        }

        preparePreview()

        return () => {
            active = false

            if (currentUrl) {
                URL.revokeObjectURL(
                    currentUrl,
                )
            }
        }
    }, [
        loading,
        selectedFrame,
        photos,
        photoTransforms,
        stickers,
    ])


    /*
     * -----------------------------------------
     * DOWNLOAD ANALYTICS
     * -----------------------------------------
     */
    const recordDownload = async () => {
        const endpoint =
            import.meta.env
                .VITE_DOWNLOAD_COUNT_ENDPOINT

        /*
         * No backend yet → do nothing.
         */
        if (!endpoint) {
            return
        }

        try {
            await fetch(
                endpoint,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        event:
                            "strip_download",

                        frameId:
                            selectedFrame?.id ||
                            null,
                    }),

                    keepalive: true,
                },
            )
        } catch (
        analyticsError
        ) {
            /*
             * Analytics must NEVER
             * interfere with downloading.
             */
            console.warn(
                "Download analytics failed:",
                analyticsError,
            )
        }
    }


    /*
     * -----------------------------------------
     * DOWNLOAD
     * -----------------------------------------
     */
    const handleDownload = async () => {
        setGenerating(true)

        try {
            const result =
                await generateStrip()

            if (!result) {
                return
            }

            if (previewUrl) {
                URL.revokeObjectURL(
                    previewUrl,
                )
            }

            setPreviewUrl(
                result.url,
            )


            const downloadUrl =
                URL.createObjectURL(
                    result.blob,
                )

            const link =
                document.createElement(
                    "a",
                )

            link.href =
                downloadUrl

            link.download =
                "kasukabe-cam-strip.png"

            document.body.appendChild(
                link,
            )

            link.click()

            link.remove()


            setTimeout(() => {
                URL.revokeObjectURL(
                    downloadUrl,
                )
            }, 1000)


            await recordDownload()
        } finally {
            setGenerating(false)
        }
    }


    /* LOADING */
    if (loading) {
        return (
            <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#fff8e8]">

                {/* Soft background wash */}
                <div className="
                absolute
                inset-0
                bg-[radial-gradient(circle_at_50%_40%,rgba(245,167,184,0.16),transparent_42%),radial-gradient(circle_at_75%_70%,rgba(92,155,85,0.10),transparent_38%)]
            " />

                {/* Loading card */}
                <div className="
                relative
                flex
                w-[min(88vw,360px)]
                flex-col
                items-center
                rounded-[28px]
                border
                border-white/70
                bg-white/35
                px-8
                py-10
                text-center
                shadow-[0_20px_60px_rgba(69,52,45,0.10)]
                backdrop-blur-xl
            ">

                    {/* Little decorative mark */}
                    <div className="
                    mb-5
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-white/70
                    bg-white/35
                    font-serif
                    text-lg
                    text-[#45342d]/70
                    shadow-sm
                ">
                        ✿
                    </div>


                    <p className="
                    font-serif
                    text-[10px]
                    uppercase
                    tracking-[0.32em]
                    text-[#45342d]/65
                ">
                        K A S U K A B E&nbsp;&nbsp; C A M
                    </p>


                    <p className="
                    mt-4
                    font-serif
                    text-xl
                    italic
                    text-[#45342d]
                ">
                        Your memories are developing...
                    </p>


                    <p className="
                    mt-2
                    text-[10px]
                    uppercase
                    tracking-[0.16em]
                    text-[#45342d]/45
                ">
                        Just a little moment ✿
                    </p>


                    {/* Loading line */}
                    <div className="
                    mt-7
                    h-px
                    w-32
                    overflow-hidden
                    bg-[#45342d]/10
                ">
                        <div className="
                        h-full
                        w-1/2
                        animate-[loading_1.4s_ease-in-out_infinite]
                        bg-[#45342d]/35
                    " />
                    </div>

                </div>

            </main>
        )
    }


    /*
     * -----------------------------------------
     * ERROR
     * -----------------------------------------
     */
    if (
        !selectedFrame ||
        photos.length === 0 ||
        !previewUrl
    ) {
        return (
            <main className="flex h-screen items-center justify-center bg-[#fff8e8]">

                <div className="px-6 text-center">

                    <p className="font-serif text-lg text-[#45342d]">
                        Your strip wandered off ✿
                    </p>

                    <p className="mt-2 text-xs text-[#45342d]/55">
                        {error ||
                            "Let's go back and make it again."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/make-strip",
                            )
                        }
                        className="
                            mt-5
                            rounded-full
                            border
                            border-white/60
                            bg-white/45
                            px-6
                            py-2.5
                            font-serif
                            text-xs
                            uppercase
                            tracking-[0.18em]
                            text-[#45342d]
                            backdrop-blur-md
                            transition
                            hover:bg-white/65
                            active:scale-95
                        "
                    >
                        Back to Strip
                    </button>

                </div>

            </main>
        )
    }


    /*
     * -----------------------------------------
     * RESULT PAGE
     * -----------------------------------------
     */
    return (
        <main className="relative h-screen w-full overflow-hidden">

            {/* BACKGROUND */}
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
                "
            />

            <div className="absolute inset-0 bg-white/15" />


            {/* GLASS CONTAINER */}
            <section className="
                relative
                z-10
                flex
                h-screen
                w-full
                items-center
                justify-center
                px-2
                py-3
                sm:p-5
                lg:p-8
            ">

                <div
                    className="
                        relative
                        flex
                        h-auto
                        max-h-[calc(100vh-2rem)]
                        w-[calc(100%-1.5rem)]
                        max-w-[980px]
                        flex-col
                        overflow-hidden
                        rounded-[28px]
                        border
                        border-white/55
                        bg-white/[0.20]
                        shadow-[0_20px_80px_rgba(69,52,45,0.16)]
                        backdrop-blur-2xl
                        sm:h-[calc(100vh-3rem)]
                    "
                >

                    <div className="
                        pointer-events-none
                        absolute
                        inset-x-0
                        top-0
                        z-50
                        h-px
                        bg-white/90
                    " />


                    {/* HEADER */}
                    <header className="
                        relative
                        z-40
                        flex
                        shrink-0
                        items-center
                        justify-between
                        px-3
                        py-2.5
                        sm:px-7
                        sm:py-4
                    ">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/stickers",
                                )
                            }
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
                            "
                            aria-label="Back to stickers"
                        >
                            <ArrowLeft
                                size={17}
                                strokeWidth={1.5}
                            />
                        </button>


                        <div className="text-center">

                            <p className="
                                font-serif
                                text-[10px]
                                uppercase
                                tracking-[0.3em]
                                text-[#45342d]
                                sm:text-xs
                            ">
                                K A S U K A B E&nbsp;&nbsp; C A M
                            </p>

                            <p className="
                                mt-0.5
                                font-serif
                                text-[10px]
                                italic
                                text-[#45342d]/60
                                sm:text-xs
                            ">
                                Your little memory strip ✿
                            </p>

                        </div>


                        <div className="w-9" />

                    </header>


                    {/* MAIN */}
                    <div className="
                        flex
                        min-h-0
                        flex-1
                        flex-col
                        items-center
                        justify-center
                        gap-2
                        px-3
                        pb-2
                        sm:gap-3
                        sm:px-6
                        lg:gap-2
                        lg:pb-1
                    ">

                        {/* STRIP */}
                        <div className="
                            flex
                            min-h-0
                            flex-1
                            items-center
                            justify-center
                            sm:flex-1
                            lg:flex-none
                        ">

                            <div
                                className="
                                    relative
                                    flex
                                    h-[min(56vh,460px)]
                                    w-auto
                                    max-w-[76vw]
                                    sm:max-w-[82vw]
                                    items-center
                                    justify-center
                                    sm:h-[min(67vh,560px)]
                                    lg:h-[min(64vh,560px)]
                                "
                                style={{
                                    aspectRatio:
                                        `${FRAME_WIDTH} / ${FRAME_HEIGHT}`,
                                }}
                            >

                                <div className="
                                    relative
                                    h-full
                                    w-full
                                    overflow-hidden
                                    rounded-[4px]
                                    shadow-[0_22px_55px_rgba(69,52,45,0.28)]
                                ">

                                    <img
                                        src={previewUrl}
                                        alt="Your completed Kasukabe Cam photobooth strip"
                                        className="
                                            h-full
                                            w-full
                                            object-contain
                                        "
                                    />

                                </div>

                            </div>

                        </div>


                        {/* MESSAGE */}
                        <div className="
                            shrink-0
                            text-center
                            -mt-1
                            sm:mt-0
                        ">

                            <p className="
                                font-serif
                                text-sm
                                italic
                                text-[#45342d]
                                sm:text-base
                            ">
                                That's a memory worth keeping ♡
                            </p>

                            <p className="
                                mt-1
                                text-[9px]
                                uppercase
                                tracking-[0.2em]
                                text-[#45342d]/45
                                sm:text-[10px]
                            ">
                                Kasukabe Cam
                            </p>

                        </div>


                        {error && (
                            <p className="
                                shrink-0
                                text-center
                                text-[10px]
                                text-[#45342d]/60
                            ">
                                {error}
                            </p>
                        )}

                    </div>


                    {/* FOOTER */}
                    <footer
                        className="
        relative
        z-40
        flex
        shrink-0
        flex-col
        items-center
        justify-center
        gap-1
        px-3
        pb-3
        pt-1
        sm:flex-row
        sm:pb-5
        sm:pt-2
        sm:gap-3
        sm:pb-5
    "
                    >
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/stickers")
                            }
                            className="
            flex
            h-10
            w-[240px]
            sm:w-[150px]
            items-center
            justify-center
            gap-1.5
            rounded-full
            border
            border-white/60
            bg-white/50
            px-4
            font-serif
            text-[10px]
            uppercase
            tracking-[0.15em]
            text-[#45342d]
            backdrop-blur-md
            transition
            hover:bg-white/70
            active:scale-95
            sm:text-xs
        "
                        >
                            <ArrowLeft
                                size={13}
                                strokeWidth={1.5}
                            />

                            Edit
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={generating}
                            className="
            flex
            h-10
            w-[240px]
            sm:w-[190px]
            items-center
            justify-center
            gap-2
            rounded-full
            border
            border-white/55
            bg-[#a99d92]/70
            px-4
            font-serif
            text-[10px]
            uppercase
            tracking-[0.18em]
            text-white
            shadow-[0_6px_20px_rgba(69,52,45,0.14)]
            backdrop-blur-md
            transition
            hover:bg-[#a99d92]/85
            active:scale-95
            disabled:cursor-wait
            disabled:opacity-60
            sm:text-xs
        "
                        >
                            {generating ? (
                                <>
                                    <RefreshCw
                                        size={13}
                                        className="animate-spin"
                                    />

                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Download
                                        size={14}
                                        strokeWidth={1.7}
                                    />

                                    Download
                                </>
                            )}
                        </button>
                    </footer>

                </div>

            </section>

        </main>
    )
}

export default Result