import { useEffect, useMemo, useRef, useState } from "react"
import {
    ArrowLeft,
    Check,
    RotateCw,
    Trash2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import kasukabeBg from "../../assets/kasukabe_bg.jpg"

import {
    FRAME_CATALOG,
    FRAME_WIDTH,
    FRAME_HEIGHT,
} from "../../data/frameCatalog"

import { getPhotos } from "../../utils/photoStore"

import {
    STICKER_CATALOG,
    STICKER_CATEGORIES,
} from "../../data/stickerCatalog"


const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value))

const DEFAULT_TRANSFORM = {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
}


function resolveFrameSrc(src) {
    const cleanPath = src.replace("./frames/", "")

    return new URL(
        `../../assets/frames/${cleanPath}`,
        import.meta.url,
    ).href
}


function Stickers() {
    const navigate = useNavigate()

    const [photos, setPhotos] = useState([])
    const [selectedFrameId, setSelectedFrameId] =
        useState(null)
    const [photoTransforms, setPhotoTransforms] =
        useState([])

    const [activeCategory, setActiveCategory] =
        useState(STICKER_CATEGORIES[0])

    const [stickers, setStickers] = useState([])

    const [selectedStickerId, setSelectedStickerId] =
        useState(null)

    const [loading, setLoading] = useState(true)

    const canvasRef = useRef(null)

    const gestureRef = useRef({
        mode: null,
        stickerId: null,
        pointerId: null,
        startX: 0,
        startY: 0,
        initialX: 50,
        initialY: 50,
        initialScale: 1,
        initialRotation: 0,
        startAngle: 0,
    })


    /*
     * LOAD THE ACTUAL STRIP
     *
     * Photos come from IndexedDB.
     * Frame + photo transforms come from sessionStorage.
     */
    useEffect(() => {
        let mounted = true

        const loadStrip = async () => {
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

                if (!mounted) return

                setPhotos(savedPhotos)

                setSelectedFrameId(
                    draft.frameId,
                )

                setPhotoTransforms(
                    draft.photoTransforms ||
                    savedPhotos.map(() => ({
                        x: 0,
                        y: 0,
                        scale: 1.12,
                        rotation: 0,
                    })),
                )
            } catch (error) {
                console.error(
                    "Unable to load strip:",
                    error,
                )

                navigate(
                    "/make-strip",
                    { replace: true },
                )
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadStrip()

        return () => {
            mounted = false
        }
    }, [navigate])


    /*
     * LOAD SAVED STICKERS
     */
    useEffect(() => {
        try {
            const savedStickers =
                sessionStorage.getItem(
                    "kasukabe-strip-stickers",
                )

            if (savedStickers) {
                setStickers(
                    JSON.parse(savedStickers),
                )
            }
        } catch (error) {
            console.error(
                "Unable to restore stickers:",
                error,
            )
        }
    }, [])


    /*
     * SAVE STICKERS
     */
    useEffect(() => {
        sessionStorage.setItem(
            "kasukabe-strip-stickers",
            JSON.stringify(stickers),
        )
    }, [stickers])


    /*
     * SELECTED FRAME
     */
    const selectedFrame = useMemo(() => {
        return FRAME_CATALOG.find(
            (frame) =>
                frame.id === selectedFrameId,
        )
    }, [selectedFrameId])


    /*
     * STICKER CATEGORY
     */
    const visibleStickers = useMemo(() => {
        return STICKER_CATALOG.filter(
            (sticker) =>
                sticker.category ===
                activeCategory,
        )
    }, [activeCategory])


    const selectedSticker = useMemo(() => {
        return stickers.find(
            (sticker) =>
                sticker.instanceId ===
                selectedStickerId,
        )
    }, [
        stickers,
        selectedStickerId,
    ])


    /*
     * ADD STICKER
     */
    const addSticker = (sticker) => {
        const instance = {
            instanceId:
                `placed-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`,

            stickerId: sticker.id,

            src: sticker.src,

            name: sticker.name,

            x: 50,
            y: 50,

            scale: 1,

            rotation: 0,
        }

        setStickers((current) => [
            ...current,
            instance,
        ])

        setSelectedStickerId(
            instance.instanceId,
        )
    }


    /*
     * UPDATE STICKER
     */
    const updateSticker = (
        instanceId,
        changes,
    ) => {
        setStickers((current) =>
            current.map((sticker) =>
                sticker.instanceId ===
                    instanceId
                    ? {
                        ...sticker,
                        ...changes,
                    }
                    : sticker,
            ),
        )
    }


    /*
     * DELETE STICKER
     */
    const deleteSticker = (
        instanceId,
    ) => {
        setStickers((current) =>
            current.filter(
                (sticker) =>
                    sticker.instanceId !==
                    instanceId,
            ),
        )

        setSelectedStickerId(null)
    }


    /*
     * ROTATE STICKER BUTTON
     */
    const rotateSticker = (
        instanceId,
    ) => {
        const sticker = stickers.find(
            (item) =>
                item.instanceId ===
                instanceId,
        )

        if (!sticker) return

        updateSticker(
            instanceId,
            {
                rotation:
                    sticker.rotation + 15,
            },
        )
    }


    /*
     * START DRAGGING STICKER
     */
    const beginStickerDrag = (
        stickerId,
        event,
    ) => {
        if (
            event.pointerType ===
            "mouse" &&
            event.button !== 0
        ) {
            return
        }

        event.stopPropagation()

        const sticker = stickers.find(
            (item) =>
                item.instanceId ===
                stickerId,
        )

        if (!sticker) return

        setSelectedStickerId(
            stickerId,
        )

        const gesture =
            gestureRef.current

        gesture.mode = "drag"
        gesture.stickerId =
            stickerId
        gesture.pointerId =
            event.pointerId

        gesture.startX =
            event.clientX

        gesture.startY =
            event.clientY

        gesture.initialX =
            sticker.x

        gesture.initialY =
            sticker.y

        event.currentTarget.setPointerCapture?.(
            event.pointerId,
        )
    }


    /*
     * MOVE STICKER
     */
    const moveStickerDrag = (
        stickerId,
        event,
    ) => {
        const gesture =
            gestureRef.current

        if (
            gesture.mode !== "drag" ||
            gesture.stickerId !==
            stickerId ||
            gesture.pointerId !==
            event.pointerId
        ) {
            return
        }

        const canvas =
            canvasRef.current

        if (!canvas) return

        const rect =
            canvas.getBoundingClientRect()

        const dx =
            ((event.clientX -
                gesture.startX) /
                rect.width) *
            100

        const dy =
            ((event.clientY -
                gesture.startY) /
                rect.height) *
            100

        updateSticker(
            stickerId,
            {
                x: clamp(
                    gesture.initialX +
                    dx,
                    -20,
                    120,
                ),

                y: clamp(
                    gesture.initialY +
                    dy,
                    -20,
                    120,
                ),
            },
        )
    }


    /*
     * END STICKER DRAG
     */
    const endStickerDrag = (
        stickerId,
        event,
    ) => {
        const gesture =
            gestureRef.current

        if (
            gesture.stickerId !==
            stickerId ||
            gesture.pointerId !==
            event.pointerId
        ) {
            return
        }

        gesture.mode = null
        gesture.stickerId = null
        gesture.pointerId = null

        event.currentTarget.releasePointerCapture?.(
            event.pointerId,
        )
    }


    /*
     * RESIZE
     */
    const beginResize = (
        stickerId,
        event,
        corner,
    ) => {
        event.stopPropagation()

        const sticker = stickers.find(
            (item) =>
                item.instanceId ===
                stickerId,
        )

        if (!sticker) return

        setSelectedStickerId(
            stickerId,
        )

        const gesture =
            gestureRef.current

        gesture.mode =
            `resize-${corner}`

        gesture.stickerId =
            stickerId

        gesture.pointerId =
            event.pointerId

        gesture.startX =
            event.clientX

        gesture.startY =
            event.clientY

        gesture.initialScale =
            sticker.scale

        event.currentTarget.setPointerCapture?.(
            event.pointerId,
        )
    }


    const moveResize = (
        stickerId,
        event,
    ) => {
        const gesture =
            gestureRef.current

        if (
            !gesture.mode?.startsWith(
                "resize-",
            ) ||
            gesture.stickerId !==
            stickerId ||
            gesture.pointerId !==
            event.pointerId
        ) {
            return
        }

        const dx =
            event.clientX -
            gesture.startX

        const dy =
            event.clientY -
            gesture.startY

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy,
            )

        const direction =
            dx + dy >= 0
                ? 1
                : -1

        const nextScale =
            clamp(
                gesture.initialScale +
                (distance /
                    150) *
                direction,
                0.35,
                3.5,
            )

        updateSticker(
            stickerId,
            {
                scale: nextScale,
            },
        )
    }


    const endResize = (
        stickerId,
        event,
    ) => {
        const gesture =
            gestureRef.current

        if (
            gesture.stickerId !==
            stickerId ||
            gesture.pointerId !==
            event.pointerId
        ) {
            return
        }

        gesture.mode = null
        gesture.stickerId = null
        gesture.pointerId = null

        event.currentTarget.releasePointerCapture?.(
            event.pointerId,
        )
    }


    /*
     * ROTATION HANDLE
     */
    const beginRotate = (
        stickerId,
        event,
    ) => {
        event.stopPropagation()

        const sticker = stickers.find(
            (item) =>
                item.instanceId ===
                stickerId,
        )

        if (!sticker) return

        setSelectedStickerId(
            stickerId,
        )

        const canvas =
            canvasRef.current

        if (!canvas) return

        const rect =
            canvas.getBoundingClientRect()

        const centerX =
            rect.left +
            (sticker.x / 100) *
            rect.width

        const centerY =
            rect.top +
            (sticker.y / 100) *
            rect.height

        const startAngle =
            Math.atan2(
                event.clientY -
                centerY,
                event.clientX -
                centerX,
            ) *
            (180 / Math.PI)

        const gesture =
            gestureRef.current

        gesture.mode = "rotate"

        gesture.stickerId =
            stickerId

        gesture.pointerId =
            event.pointerId

        gesture.startAngle =
            startAngle

        gesture.initialRotation =
            sticker.rotation

        event.currentTarget.setPointerCapture?.(
            event.pointerId,
        )
    }


    const moveRotate = (
        stickerId,
        event,
    ) => {
        const gesture =
            gestureRef.current

        if (
            gesture.mode !==
            "rotate" ||
            gesture.stickerId !==
            stickerId ||
            gesture.pointerId !==
            event.pointerId
        ) {
            return
        }

        const sticker = stickers.find(
            (item) =>
                item.instanceId ===
                stickerId,
        )

        const canvas =
            canvasRef.current

        if (!sticker || !canvas)
            return

        const rect =
            canvas.getBoundingClientRect()

        const centerX =
            rect.left +
            (sticker.x / 100) *
            rect.width

        const centerY =
            rect.top +
            (sticker.y / 100) *
            rect.height

        const angle =
            Math.atan2(
                event.clientY -
                centerY,
                event.clientX -
                centerX,
            ) *
            (180 / Math.PI)

        const delta =
            angle -
            gesture.startAngle

        updateSticker(
            stickerId,
            {
                rotation:
                    gesture.initialRotation +
                    delta,
            },
        )
    }


    const endRotate = (
        stickerId,
        event,
    ) => {
        const gesture =
            gestureRef.current

        if (
            gesture.stickerId !==
            stickerId ||
            gesture.pointerId !==
            event.pointerId
        ) {
            return
        }

        gesture.mode = null
        gesture.stickerId = null
        gesture.pointerId = null

        event.currentTarget.releasePointerCapture?.(
            event.pointerId,
        )
    }


    /*
     * CLICK OUTSIDE → DESELECT
     */
    const handleCanvasPointerDown = (
        event,
    ) => {
        if (
            event.target.closest(
                "[data-sticker-object]",
            )
        ) {
            return
        }

        setSelectedStickerId(null)
    }


    /*
     * DONE
     */
    const handleDone = () => {
        if (!canvasRef.current) {
            sessionStorage.setItem(
                "kasukabe-strip-stickers",
                JSON.stringify(stickers),
            )

            navigate("/result")
            return
        }

        const canvasWidth =
            canvasRef.current.getBoundingClientRect().width

        const normalizedStickers =
            stickers.map((sticker) => ({
                ...sticker,

                /*
                 * Store the sticker's actual visual
                 * size relative to the strip.
                 *
                 * The editor renders stickers at:
                 *
                 * 100px × sticker.scale
                 *
                 * so we convert that to a percentage
                 * of the actual strip canvas width.
                 */
                sizePercent:
                    ((100 * sticker.scale) /
                        canvasWidth) *
                    100,
            }))

        sessionStorage.setItem(
            "kasukabe-strip-stickers",
            JSON.stringify(
                normalizedStickers,
            ),
        )

        navigate("/result")
    }


    if (loading) {
        return (
            <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#fff8e8]">

                <div className="
                absolute
                inset-0
                bg-[radial-gradient(circle_at_50%_40%,rgba(245,167,184,0.16),transparent_42%),radial-gradient(circle_at_75%_70%,rgba(92,155,85,0.10),transparent_38%)]
            " />

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
                        Adding a little magic...
                    </p>

                    <p className="
                    mt-2
                    text-[10px]
                    uppercase
                    tracking-[0.16em]
                    text-[#45342d]/45
                ">
                        Your memories are safe ✿
                    </p>

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


    if (
        !loading &&
        (!selectedFrame ||
            photos.length === 0)
    ) {
        return (
            <main className="flex h-screen items-center justify-center bg-[#fff8e8]">
                <div className="text-center">
                    <p className="font-serif text-lg text-[#45342d]">
                        Your memories wandered off ✿
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/make-strip",
                            )
                        }
                        className="mt-5 rounded-full border border-white/60 bg-white/45 px-6 py-2.5 font-serif text-xs uppercase tracking-[0.18em] text-[#45342d] backdrop-blur-md"
                    >
                        Back to Strip
                    </button>
                </div>
            </main>
        )
    }


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


            {/* OUTER GLASS */}
            <section className="relative z-10 flex h-screen w-full items-center justify-center px-3 py-4 sm:p-5 lg:p-8">

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

                    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-px bg-white/90" />


                    {/* HEADER */}
                    <header className="relative z-40 flex shrink-0 items-center justify-between px-4 py-3 sm:px-7 sm:py-4">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/make-strip",
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
                            aria-label="Back to strip editor"
                        >
                            <ArrowLeft
                                size={17}
                                strokeWidth={1.5}
                            />
                        </button>


                        <div className="text-center">

                            <p className="font-serif text-[10px] uppercase tracking-[0.3em] text-[#45342d] sm:text-xs">
                                K A S U K A B E&nbsp;&nbsp; C A M
                            </p>

                            <p className="mt-0.5 font-serif text-[10px] italic text-[#45342d]/60 sm:text-xs">
                                Add a little something ✿
                            </p>

                        </div>


                        <div className="w-9" />

                    </header>


                    {/* MAIN */}
                    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-3 pb-3 sm:gap-5 sm:px-6 lg:flex-row lg:justify-center lg:gap-10">


                        {/* ============================= */}
                        {/* STRIP */}
                        {/* ============================= */}

                        <div className="flex min-h-0 flex-1 items-center justify-center">

                            <div
                                ref={canvasRef}
                                onPointerDown={
                                    handleCanvasPointerDown
                                }
                                className="
                                    relative
                                    flex
                                    h-[min(39vh,330px)]
                                    w-auto
                                    max-w-[82vw]
                                    items-center
                                    justify-center
                                    sm:h-[min(54vh,455px)]
                                    lg:h-[min(58vh,500px)]
                                    lg:max-w-[44vw]
                                "
                                style={{
                                    aspectRatio:
                                        `${FRAME_WIDTH} / ${FRAME_HEIGHT}`,
                                }}
                            >

                                {/* ============================= */}
                                {/* PHOTO + FRAME COMPOSITION */}
                                {/* ============================= */}

                                <div className="absolute inset-0 overflow-hidden rounded-[3px] shadow-[0_16px_45px_rgba(69,52,45,0.22)]">

                                    {/* PHOTOS UNDER FRAME */}
                                    {selectedFrame.slots.map(
                                        (
                                            slot,
                                            index,
                                        ) => {
                                            const photo =
                                                photos[
                                                index
                                                ]

                                            if (
                                                !photo
                                            ) {
                                                return null
                                            }

                                            const transform =
                                                photoTransforms[
                                                index
                                                ] || DEFAULT_TRANSFORM

                                            return (
                                                <div
                                                    key={`${selectedFrame.id}-photo-${index}`}
                                                    className="
                                                        absolute
                                                        overflow-hidden
                                                    "
                                                    style={{
                                                        left: `${(slot.x / FRAME_WIDTH) * 100}%`,
                                                        top: `${(slot.y / FRAME_HEIGHT) * 100}%`,
                                                        width: `${(slot.width / FRAME_WIDTH) * 100}%`,
                                                        height: `${(slot.height / FRAME_HEIGHT) * 100}%`,
                                                    }}
                                                >

                                                    <img
                                                        src={
                                                            photo.preview
                                                        }
                                                        alt={`Strip photo ${index + 1}`}
                                                        draggable={
                                                            false
                                                        }
                                                        className="
                                                            absolute
                                                            left-1/2
                                                            top-1/2
                                                            h-full
                                                            w-full
                                                            select-none
                                                            object-contain
                                                        "
                                                        style={{
                                                            transform: `
                                                                translate(
                                                                    calc(-50% + ${transform.x}px),
                                                                    calc(-50% + ${transform.y}px)
                                                                )
                                                                scale(${transform.scale})
                                                                rotate(${transform.rotation}deg)
                                                            `,
                                                        }}
                                                    />

                                                </div>
                                            )
                                        },
                                    )}


                                    {/* FRAME ABOVE PHOTOS */}
                                    <img
                                        src={resolveFrameSrc(
                                            selectedFrame.src,
                                        )}
                                        alt=""
                                        aria-hidden="true"
                                        className="
                                            pointer-events-none
                                            absolute
                                            inset-0
                                            h-full
                                            w-full
                                            object-contain
                                        "
                                    />

                                </div>


                                {/* ============================= */}
                                {/* STICKERS ABOVE EVERYTHING */}
                                {/* ============================= */}

                                {stickers.map(
                                    (
                                        sticker,
                                    ) => {
                                        const isSelected =
                                            sticker.instanceId ===
                                            selectedStickerId

                                        return (
                                            <div
                                                key={
                                                    sticker.instanceId
                                                }
                                                data-sticker-object
                                                className="
                                                    absolute
                                                    z-50
                                                "
                                                style={{
                                                    left: `${sticker.x}%`,
                                                    top: `${sticker.y}%`,
                                                    transform:
                                                        "translate(-50%, -50%)",
                                                    width: `${100 * sticker.scale}px`,
                                                    height: `${100 * sticker.scale}px`,
                                                }}
                                                onPointerDown={(
                                                    event,
                                                ) =>
                                                    beginStickerDrag(
                                                        sticker.instanceId,
                                                        event,
                                                    )
                                                }
                                                onPointerMove={(
                                                    event,
                                                ) =>
                                                    moveStickerDrag(
                                                        sticker.instanceId,
                                                        event,
                                                    )
                                                }
                                                onPointerUp={(
                                                    event,
                                                ) =>
                                                    endStickerDrag(
                                                        sticker.instanceId,
                                                        event,
                                                    )
                                                }
                                                onPointerCancel={(
                                                    event,
                                                ) =>
                                                    endStickerDrag(
                                                        sticker.instanceId,
                                                        event,
                                                    )
                                                }
                                            >

                                                <div
                                                    className="relative h-full w-full"
                                                    style={{
                                                        transform: `rotate(${sticker.rotation}deg)`,
                                                    }}
                                                >

                                                    <img
                                                        src={
                                                            sticker.src
                                                        }
                                                        alt={
                                                            sticker.name
                                                        }
                                                        draggable={
                                                            false
                                                        }
                                                        className="
                                                            pointer-events-none
                                                            h-full
                                                            w-full
                                                            select-none
                                                            object-contain
                                                        "
                                                    />


                                                    {isSelected && (
                                                        <>
                                                            {/* SELECTION BORDER */}

                                                            <div className="
                                                                pointer-events-none
                                                                absolute
                                                                inset-[-5px]
                                                                border-2
                                                                border-[#8b4de8]
                                                                shadow-[0_0_0_1px_rgba(255,255,255,0.9)]
                                                            " />


                                                            {/* CORNER HANDLES */}

                                                            {[
                                                                "top-left",
                                                                "top-right",
                                                                "bottom-left",
                                                                "bottom-right",
                                                            ].map(
                                                                (
                                                                    corner,
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            corner
                                                                        }
                                                                        onPointerDown={(
                                                                            event,
                                                                        ) =>
                                                                            beginResize(
                                                                                sticker.instanceId,
                                                                                event,
                                                                                corner,
                                                                            )
                                                                        }
                                                                        onPointerMove={(
                                                                            event,
                                                                        ) =>
                                                                            moveResize(
                                                                                sticker.instanceId,
                                                                                event,
                                                                            )
                                                                        }
                                                                        onPointerUp={(
                                                                            event,
                                                                        ) =>
                                                                            endResize(
                                                                                sticker.instanceId,
                                                                                event,
                                                                            )
                                                                        }
                                                                        onPointerCancel={(
                                                                            event,
                                                                        ) =>
                                                                            endResize(
                                                                                sticker.instanceId,
                                                                                event,
                                                                            )
                                                                        }
                                                                        className={`
                                                                            absolute
                                                                            h-3
                                                                            w-3
                                                                            rounded-full
                                                                            border-2
                                                                            border-white
                                                                            bg-white
                                                                            shadow-md

                                                                            ${corner ===
                                                                                "top-left"
                                                                                ? "-left-[7px] -top-[7px]"
                                                                                : ""
                                                                            }

                                                                            ${corner ===
                                                                                "top-right"
                                                                                ? "-right-[7px] -top-[7px]"
                                                                                : ""
                                                                            }

                                                                            ${corner ===
                                                                                "bottom-left"
                                                                                ? "-bottom-[7px] -left-[7px]"
                                                                                : ""
                                                                            }

                                                                            ${corner ===
                                                                                "bottom-right"
                                                                                ? "-bottom-[7px] -right-[7px]"
                                                                                : ""
                                                                            }
                                                                        `}
                                                                    />
                                                                ),
                                                            )}


                                                            {/* ROTATION STEM */}

                                                            <div className="
                                                                pointer-events-none
                                                                absolute
                                                                left-1/2
                                                                top-full
                                                                h-7
                                                                w-px
                                                                -translate-x-1/2
                                                                bg-[#8b4de8]
                                                            " />


                                                            {/* ROTATION HANDLE */}

                                                            <button
                                                                type="button"
                                                                onPointerDown={(
                                                                    event,
                                                                ) =>
                                                                    beginRotate(
                                                                        sticker.instanceId,
                                                                        event,
                                                                    )
                                                                }
                                                                onPointerMove={(
                                                                    event,
                                                                ) =>
                                                                    moveRotate(
                                                                        sticker.instanceId,
                                                                        event,
                                                                    )
                                                                }
                                                                onPointerUp={(
                                                                    event,
                                                                ) =>
                                                                    endRotate(
                                                                        sticker.instanceId,
                                                                        event,
                                                                    )
                                                                }
                                                                onPointerCancel={(
                                                                    event,
                                                                ) =>
                                                                    endRotate(
                                                                        sticker.instanceId,
                                                                        event,
                                                                    )
                                                                }
                                                                className="
                                                                    absolute
                                                                    left-1/2
                                                                    top-[calc(100%+28px)]
                                                                    flex
                                                                    h-8
                                                                    w-8
                                                                    -translate-x-1/2
                                                                    -translate-y-1/2
                                                                    items-center
                                                                    justify-center
                                                                    rounded-full
                                                                    border-2
                                                                    border-white
                                                                    bg-white
                                                                    text-[#45342d]
                                                                    shadow-[0_3px_12px_rgba(0,0,0,0.2)]
                                                                    active:scale-90
                                                                "
                                                                aria-label="Rotate sticker"
                                                            >
                                                                <RotateCw
                                                                    size={
                                                                        14
                                                                    }
                                                                    strokeWidth={
                                                                        1.7
                                                                    }
                                                                />
                                                            </button>

                                                        </>
                                                    )}

                                                </div>

                                            </div>
                                        )
                                    },
                                )}

                            </div>

                        </div>


                        {/* ============================= */}
                        {/* STICKER PICKER */}
                        {/* ============================= */}

                        <aside
                            className="
                                flex
                                w-full
                                shrink-0
                                flex-col
                                rounded-[24px]
                                border
                                border-white/45
                                bg-white/20
                                p-3
                                shadow-[0_10px_35px_rgba(69,52,45,0.10)]
                                backdrop-blur-xl
                                sm:w-[360px]
                                lg:w-[300px]
                            "
                        >

                            <div className="text-center">

                                <p className="font-serif text-xs uppercase tracking-[0.24em] text-[#45342d]">
                                    Add Stickers
                                </p>

                                <p className="mt-1 text-[10px] text-[#45342d]/55">
                                    Pick something cute for your strip ✿
                                </p>

                            </div>


                            {/* CATEGORIES */}

                            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">

                                {STICKER_CATEGORIES.map(
                                    (
                                        category,
                                    ) => (
                                        <button
                                            key={
                                                category
                                            }
                                            type="button"
                                            onClick={() =>
                                                setActiveCategory(
                                                    category,
                                                )
                                            }
                                            className={`
                                                shrink-0
                                                rounded-full
                                                border
                                                px-3
                                                py-1.5
                                                font-serif
                                                text-[9px]
                                                uppercase
                                                tracking-[0.12em]
                                                transition

                                                ${activeCategory ===
                                                    category
                                                    ? "border-white/70 bg-white/45 text-[#45342d]"
                                                    : "border-white/35 bg-white/15 text-[#45342d]/60 hover:bg-white/30"
                                                }
                                            `}
                                        >
                                            {
                                                category
                                            }
                                        </button>
                                    ),
                                )}

                            </div>


                            {/* STICKER GRID */}

                            <div className="
                                mt-3
                                grid
                                max-h-[34vh]
                                grid-cols-5
                                gap-2
                                overflow-y-auto
                                pr-1
                                sm:grid-cols-6
                                lg:grid-cols-5
                            ">

                                {visibleStickers.map(
                                    (
                                        sticker,
                                    ) => (
                                        <button
                                            key={
                                                sticker.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                addSticker(
                                                    sticker,
                                                )
                                            }
                                            className="
                                                group
                                                flex
                                                aspect-square
                                                items-center
                                                justify-center
                                                rounded-xl
                                                border
                                                border-white/35
                                                bg-white/15
                                                p-1.5
                                                transition
                                                hover:-translate-y-0.5
                                                hover:border-white/60
                                                hover:bg-white/35
                                                active:scale-95
                                            "
                                            title={
                                                sticker.name
                                            }
                                        >
                                            <img
                                                src={
                                                    sticker.src
                                                }
                                                alt={
                                                    sticker.name
                                                }
                                                draggable={
                                                    false
                                                }
                                                className="
                                                    h-full
                                                    w-full
                                                    object-contain
                                                    transition
                                                    group-hover:scale-105
                                                "
                                            />
                                        </button>
                                    ),
                                )}

                            </div>


                            {/* SELECTED STICKER ACTIONS */}

                            {selectedSticker && (
                                <div className="
                                    mt-3
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    border-t
                                    border-white/30
                                    pt-3
                                ">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            rotateSticker(
                                                selectedSticker.instanceId,
                                            )
                                        }
                                        className="
                                            flex
                                            items-center
                                            gap-1.5
                                            rounded-full
                                            border
                                            border-white/40
                                            bg-white/20
                                            px-3
                                            py-1.5
                                            font-serif
                                            text-[9px]
                                            uppercase
                                            tracking-[0.12em]
                                            text-[#45342d]
                                            backdrop-blur-md
                                            transition
                                            hover:bg-white/35
                                        "
                                    >
                                        <RotateCw
                                            size={12}
                                        />

                                        Rotate
                                    </button>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            deleteSticker(
                                                selectedSticker.instanceId,
                                            )
                                        }
                                        className="
                                            flex
                                            items-center
                                            gap-1.5
                                            rounded-full
                                            border
                                            border-white/40
                                            bg-white/20
                                            px-3
                                            py-1.5
                                            font-serif
                                            text-[9px]
                                            uppercase
                                            tracking-[0.12em]
                                            text-[#45342d]
                                            backdrop-blur-md
                                            transition
                                            hover:bg-white/35
                                        "
                                    >
                                        <Trash2
                                            size={12}
                                        />

                                        Remove
                                    </button>

                                </div>
                            )}

                        </aside>

                    </div>


                    {/* FOOTER */}

                    <footer className="
                        relative
                        z-40
                        flex
                        shrink-0
                        items-center
                        justify-center
                        gap-2
                        px-3
                        pb-3
                        pt-1
                        sm:gap-3
                        sm:pb-5
                    ">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/make-strip",
                                )
                            }
                            className="
                                h-10
                                w-[150px]
                                rounded-full
                                border
                                border-white/60
                                bg-white/50
                                px-4
                                font-serif
                                text-[10px]
                                uppercase
                                tracking-[0.16em]
                                text-[#45342d]
                                backdrop-blur-md
                                transition
                                hover:bg-white/70
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
                            onClick={
                                handleDone
                            }
                            className="
                                flex
                                h-10
                                w-[150px]
                                items-center
                                justify-center
                                gap-1.5
                                rounded-full
                                border
                                border-white/55
                                bg-[#a99d92]/60
                                px-4
                                font-serif
                                text-[10px]
                                uppercase
                                tracking-[0.18em]
                                text-white
                                shadow-[0_6px_20px_rgba(69,52,45,0.12)]
                                backdrop-blur-md
                                transition
                                hover:bg-[#a99d92]/75
                                active:scale-95
                                sm:w-auto
                                sm:px-8
                                sm:text-xs
                            "
                        >
                            Done

                            <Check
                                size={13}
                                strokeWidth={1.5}
                            />
                        </button>

                    </footer>

                </div>

            </section>

        </main>
    )
}

export default Stickers