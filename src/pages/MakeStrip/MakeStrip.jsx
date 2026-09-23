import { useEffect, useMemo, useRef, useState } from "react"
import {
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    RotateCcw,
    RotateCw,
    ZoomIn,
    ZoomOut,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import kasukabeBg from "../../assets/kasukabe_photobooth.png"
import {
    FRAME_CATALOG,
    FRAME_WIDTH,
    FRAME_HEIGHT,
} from "../../data/frameCatalog"
import { getPhotos, savePhotos } from "../../utils/photoStore"

function resolveFrameSrc(src) {
    const cleanPath = src.replace("./frames/", "")

    return new URL(
        `../../assets/frames/${cleanPath}`,
        import.meta.url,
    ).href
}

const DEFAULT_TRANSFORM = {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
}

const clamp = (value, min, max) =>
    Math.min(max, Math.max(min, value))

const normalizeAngle = (angle) => {
    let result = angle

    while (result > 180) result -= 360
    while (result < -180) result += 360

    return result
}

function MakeStrip() {
    const navigate = useNavigate()

    const [photos, setPhotos] = useState([])
    const [selectedFrameId, setSelectedFrameId] = useState(null)
    const [photoTransforms, setPhotoTransforms] = useState([])
    const [editingPhotoIndex, setEditingPhotoIndex] = useState(null)
    const [loading, setLoading] = useState(true)

    const swipeStartRef = useRef(null)
    const slotRefs = useRef({})

    /*
     * One-finger drag:
     * moves the selected image freely inside its slot.
     *
     * Two-finger gesture:
     * pinch = zoom
     * twist = rotate
     */
    const gestureRef = useRef({
        pointers: new Map(),
        mode: null,
        index: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        startDistance: 0,
        startAngle: 0,
        initialScale: 1,
        initialRotation: 0,
    })

    /*
     * Reordering is deliberately separate from image adjustment.
     * A photo can be dragged out of its slot and dropped on another slot.
     */
    const reorderDragRef = useRef(null)

    useEffect(() => {
        let mounted = true

        const loadPhotos = async () => {
            try {
                const savedPhotos = await getPhotos()

                if (!mounted) return

                setPhotos(savedPhotos)
                setPhotoTransforms(
                    savedPhotos.map(() => ({
                        ...DEFAULT_TRANSFORM,
                    })),
                )
            } catch (error) {
                console.error("Unable to load photos:", error)
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }

        loadPhotos()

        return () => {
            mounted = false
        }
    }, [])

    const availableFrames = useMemo(() => {
        return FRAME_CATALOG.filter(
            (frame) => frame.photoCount === photos.length,
        )
    }, [photos.length])

    useEffect(() => {
        if (availableFrames.length === 0) {
            setSelectedFrameId(null)
            return
        }

        const stillExists = availableFrames.some(
            (frame) => frame.id === selectedFrameId,
        )

        if (!stillExists) {
            setSelectedFrameId(availableFrames[0].id)
        }
    }, [availableFrames, selectedFrameId])

    const selectedFrame = useMemo(() => {
        return (
            availableFrames.find(
                (frame) => frame.id === selectedFrameId,
            ) || availableFrames[0]
        )
    }, [availableFrames, selectedFrameId])

    const selectedFrameIndex = Math.max(
        0,
        availableFrames.findIndex(
            (frame) => frame.id === selectedFrame?.id,
        ),
    )

    const cycleFrame = (direction) => {
        if (availableFrames.length === 0) return

        const nextIndex =
            (selectedFrameIndex +
                direction +
                availableFrames.length) %
            availableFrames.length

        setSelectedFrameId(availableFrames[nextIndex].id)
        setEditingPhotoIndex(null)
    }

    const updatePhotoTransform = (index, changes) => {
        setPhotoTransforms((current) => {
            const next = [...current]

            next[index] = {
                ...(next[index] || DEFAULT_TRANSFORM),
                ...changes,
            }

            return next
        })
    }

    const resetPhoto = (index) => {
        updatePhotoTransform(index, {
            ...DEFAULT_TRANSFORM,
        })
    }

    const rotatePhoto = (index, amount) => {
        const current =
            photoTransforms[index] || DEFAULT_TRANSFORM

        updatePhotoTransform(index, {
            rotation: current.rotation + amount,
        })
    }

    const zoomPhoto = (index, amount) => {
        const current =
            photoTransforms[index] || DEFAULT_TRANSFORM

        updatePhotoTransform(index, {
            scale: clamp(
                current.scale + amount,
                0.6,
                3,
            ),
        })
    }

    const getPhotoSlotAtPoint = (clientX, clientY) => {
        const element = document
            .elementFromPoint(clientX, clientY)
            ?.closest("[data-photo-slot-index]")

        if (!element) return -1

        const index = Number(
            element.getAttribute("data-photo-slot-index"),
        )

        return Number.isInteger(index) ? index : -1
    }

    const reorderPhotos = (sourceIndex, targetIndex) => {
        if (
            sourceIndex < 0 ||
            targetIndex < 0 ||
            sourceIndex >= photos.length ||
            targetIndex >= photos.length ||
            sourceIndex === targetIndex
        ) {
            return
        }

        const nextPhotos = [...photos]
        const [movedPhoto] = nextPhotos.splice(
            sourceIndex,
            1,
        )

        nextPhotos.splice(targetIndex, 0, movedPhoto)

        const nextTransforms = [...photoTransforms]
        const [movedTransform] = nextTransforms.splice(
            sourceIndex,
            1,
        )

        nextTransforms.splice(
            targetIndex,
            0,
            movedTransform,
        )

        setPhotos(nextPhotos)
        setPhotoTransforms(nextTransforms)
        setEditingPhotoIndex(targetIndex)

        savePhotos(nextPhotos).catch((error) => {
            console.error(
                "Unable to save reordered photos:",
                error,
            )
        })
    }

    const beginPhotoGesture = (index, event) => {
        if (
            event.pointerType === "mouse" &&
            event.button !== 0
        ) {
            return
        }

        event.stopPropagation()

        const gesture = gestureRef.current

        gesture.pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        })

        setEditingPhotoIndex(index)

        const current =
            photoTransforms[index] || DEFAULT_TRANSFORM

        if (gesture.pointers.size === 1) {
            gesture.mode = "drag"
            gesture.index = index
            gesture.startX = event.clientX
            gesture.startY = event.clientY
            gesture.initialX = current.x
            gesture.initialY = current.y
            gesture.initialScale = current.scale
            gesture.initialRotation = current.rotation
        }

        if (
            gesture.pointers.size === 2 &&
            gesture.index === index
        ) {
            const points = Array.from(
                gesture.pointers.values(),
            )

            const dx = points[1].x - points[0].x
            const dy = points[1].y - points[0].y

            gesture.mode = "pinch"
            gesture.startDistance = Math.hypot(
                dx,
                dy,
            )
            gesture.startAngle =
                (Math.atan2(dy, dx) * 180) / Math.PI
            gesture.initialScale = current.scale
            gesture.initialRotation = current.rotation
        }

        event.currentTarget.setPointerCapture?.(
            event.pointerId,
        )
    }

    const movePhotoGesture = (index, event) => {
        const gesture = gestureRef.current

        if (!gesture.pointers.has(event.pointerId)) {
            return
        }

        gesture.pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        })

        if (
            gesture.index !== index ||
            gesture.pointers.size === 0
        ) {
            return
        }

        if (
            gesture.mode === "pinch" &&
            gesture.pointers.size >= 2
        ) {
            const points = Array.from(
                gesture.pointers.values(),
            )

            const dx = points[1].x - points[0].x
            const dy = points[1].y - points[0].y

            const distance = Math.hypot(dx, dy)

            const angle =
                (Math.atan2(dy, dx) * 180) / Math.PI

            const angleDelta = normalizeAngle(
                angle - gesture.startAngle,
            )

            const nextScale = clamp(
                gesture.initialScale *
                (distance /
                    Math.max(
                        gesture.startDistance,
                        1,
                    )),
                0.6,
                3,
            )

            /*
             * A two-finger twist rotates the photo.
             * The final value is free while moving and snaps to
             * the nearest 90° when the gesture ends.
             */
            updatePhotoTransform(index, {
                scale: nextScale,
                rotation:
                    gesture.initialRotation +
                    angleDelta,
            })

            return
        }

        if (gesture.mode !== "drag") return

        const dx =
            event.clientX - gesture.startX
        const dy =
            event.clientY - gesture.startY

        updatePhotoTransform(index, {
            x: gesture.initialX + dx,
            y: gesture.initialY + dy,
        })

        /*
         * Once the user drags beyond the slot boundary, this same
         * gesture becomes a reorder gesture. The image itself is
         * never constrained, so the top/edges remain reachable.
         */
        const rect =
            event.currentTarget.getBoundingClientRect()

        if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
        ) {
            gesture.mode = "reorder"
            reorderDragRef.current = {
                sourceIndex: index,
                pointerId: event.pointerId,
            }
        }
    }

    const endPhotoGesture = (index, event) => {
        const gesture = gestureRef.current

        if (!gesture.pointers.has(event.pointerId)) {
            return
        }

        gesture.pointers.delete(event.pointerId)

        if (
            gesture.mode === "reorder" &&
            reorderDragRef.current
        ) {
            const targetIndex = getPhotoSlotAtPoint(
                event.clientX,
                event.clientY,
            )

            reorderPhotos(
                reorderDragRef.current.sourceIndex,
                targetIndex,
            )

            reorderDragRef.current = null
        }

        /*
         * When a two-finger gesture ends, make the rotation feel
         * intentional by snapping to a 90° increment.
         */
        if (
            gesture.mode === "pinch" &&
            gesture.pointers.size === 0
        ) {
            const current =
                photoTransforms[index] ||
                DEFAULT_TRANSFORM

            const snappedRotation =
                Math.round(
                    current.rotation / 90,
                ) * 90

            updatePhotoTransform(index, {
                rotation: snappedRotation,
            })
        }

        if (gesture.pointers.size === 0) {
            gesture.mode = null
            gesture.index = null
        } else if (gesture.pointers.size === 1) {
            const remaining =
                Array.from(
                    gesture.pointers.values(),
                )[0]

            gesture.mode = "drag"
            gesture.startX = remaining.x
            gesture.startY = remaining.y

            const current =
                photoTransforms[index] ||
                DEFAULT_TRANSFORM

            gesture.initialX = current.x
            gesture.initialY = current.y
        }

        event.currentTarget.releasePointerCapture?.(
            event.pointerId,
        )
    }

    const startPreviewSwipe = (event) => {
        if (editingPhotoIndex !== null) return
        if (event.pointerType === "mouse") return

        swipeStartRef.current = {
            x: event.clientX,
            y: event.clientY,
        }
    }

    const endPreviewSwipe = (event) => {
        const start = swipeStartRef.current

        if (!start) return

        swipeStartRef.current = null

        const dx = event.clientX - start.x
        const dy = event.clientY - start.y

        if (
            Math.abs(dx) < 45 ||
            Math.abs(dx) < Math.abs(dy)
        ) {
            return
        }

        cycleFrame(dx < 0 ? 1 : -1)
    }

    const handleBack = () => {
        navigate("/review")
    }

    const handleMakeMyStrip = () => {
        if (!selectedFrame) return

        sessionStorage.setItem(
            "kasukabe-strip-draft",
            JSON.stringify({
                frameId: selectedFrame.id,
                photoTransforms,
            }),
        )

        navigate("/stickers")
    }

    if (loading) {
        return (
            <main className="flex h-screen items-center justify-center bg-[#fff8e8]">
                <p className="font-serif text-xs uppercase tracking-[0.25em] text-[#45342d]">
                    Preparing your memories...
                </p>
            </main>
        )
    }

    if (
        photos.length < 2 ||
        photos.length > 4
    ) {
        return (
            <main className="relative flex h-screen items-center justify-center overflow-hidden">
                <img
                    src={kasukabeBg}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-105 object-contain blur-[8px]"
                />

                <div className="relative z-10 w-[calc(100%-2rem)] max-w-md rounded-[28px] border border-white/60 bg-white/25 p-8 text-center shadow-[0_20px_70px_rgba(69,52,45,0.16)] backdrop-blur-2xl">
                    <p className="font-serif text-lg text-[#45342d]">
                        We need a few more memories ✿
                    </p>

                    <p className="mt-2 text-sm text-[#45342d]/65">
                        Choose between 2 and 4 photos before
                        making your strip.
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/review")}
                        className="mt-6 rounded-full border border-white/60 bg-white/45 px-6 py-2.5 font-serif text-xs uppercase tracking-[0.18em] text-[#45342d] backdrop-blur-md transition hover:bg-white/65 active:scale-95"
                    >
                        ← Back to Review
                    </button>
                </div>
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
                "
            />

            <div className="absolute inset-0 bg-white/15" />

            <section className="relative z-10 flex h-screen w-full items-center justify-center px-3 py-4 sm:p-5 lg:p-8">
                {/* Mobile editorial text */}
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
                        max-h-[calc(100vh-1.5rem)]
                        w-[calc(100%-2rem)]
                        max-w-[1000px]
                        flex-col
                        overflow-hidden
                        rounded-[28px]
                        border
                        border-white/55
                        bg-white/[0.20]
                        shadow-[0_20px_80px_rgba(69,52,45,0.16)]
                        backdrop-blur-2xl
                        sm:h-[calc(100vh-3rem)]
                        sm:w-[calc(100%-2.5rem)]
                        lg:h-[calc(100vh-6.5rem)]
                    "
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-px bg-white/90" />

                    {/* Header */}
                    <header className="relative z-40 flex shrink-0 items-center justify-between px-4 py-2.5 sm:px-7 sm:py-4">
                        <button
                            type="button"
                            onClick={handleBack}
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
                            aria-label="Back to review"
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
                                Make your little strip ✿
                            </p>
                        </div>

                        <div className="w-9 sm:w-10" />
                    </header>

                    {/* Editor */}
                    <div
                        className="flex min-h-0 flex-none flex-col items-center justify-start gap-2 px-3 pb-1 pt-1 sm:flex-row sm:justify-center sm:gap-7 sm:px-8 sm:pb-4 sm:pt-0 lg:flex-1 lg:gap-10"
                        onPointerDown={(event) => {
                            if (
                                !event.target.closest(
                                    "[data-photo-slot-index]",
                                )
                            ) {
                                setEditingPhotoIndex(null)
                            }
                        }}
                    >
                        {/* Strip preview */}
                        <div className="relative flex min-h-0 flex-none items-center justify-center lg:flex-1">
                            {selectedFrame && (
                                <div className="relative flex flex-col items-center justify-center rounded-[20px] border border-white/25 bg-white/[0.07] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] sm:p-5 lg:mt-1 lg:max-h-full">
                                    {/* Mobile layout swipe hint */}
                                    <div className="pointer-events-none relative z-30 mb-1 whitespace-nowrap lg:hidden">
                                        <span className="rounded-full border border-white/45 bg-white/25 px-3 py-1 font-serif text-[9px] uppercase tracking-[0.18em] text-[#45342d]/65 backdrop-blur-md">
                                            ← swipe for layouts →
                                        </span>
                                    </div>

                                    <div
                                        className="
                                            relative
                                            h-[min(39vh,330px)]
                                            w-auto
                                            max-w-[82vw]
                                            touch-pan-y
                                            overflow-visible
                                            rounded-[3px]
                                            bg-white/10
                                            shadow-[0_16px_45px_rgba(69,52,45,0.22)]
                                            isolate
                                            sm:h-[min(54vh,455px)]
                                            lg:h-[min(58vh,500px)]
                                            lg:max-w-[44vw]
                                        "
                                        style={{
                                            aspectRatio: `${FRAME_WIDTH} / ${FRAME_HEIGHT}`,
                                        }}
                                        onPointerDown={
                                            startPreviewSwipe
                                        }
                                        onPointerUp={
                                            endPreviewSwipe
                                        }
                                    >
                                        {/* Actual frame / crop surface */}
                                        <div className="absolute inset-0 overflow-hidden rounded-[3px]">
                                            {selectedFrame.slots.map(
                                                (slot, index) => {
                                                    const photo =
                                                        photos[index]

                                                    if (!photo) {
                                                        return null
                                                    }

                                                    const transform =
                                                        photoTransforms[
                                                        index
                                                        ] ||
                                                        DEFAULT_TRANSFORM

                                                    const isEditing =
                                                        editingPhotoIndex ===
                                                        index

                                                    return (
                                                        <div
                                                            key={`${selectedFrame.id}-slot-${index}`}
                                                            data-photo-slot-index={
                                                                index
                                                            }
                                                            ref={(element) => {
                                                                slotRefs.current[index] =
                                                                    element
                                                            }}
                                                            className={`
                                                                absolute
                                                                touch-none
                                                                overflow-hidden
                                                                z-10
                                                            `}
                                                            style={{
                                                                left: `${(slot.x / FRAME_WIDTH) * 100}%`,
                                                                top: `${(slot.y / FRAME_HEIGHT) * 100}%`,
                                                                width: `${(slot.width / FRAME_WIDTH) * 100}%`,
                                                                height: `${(slot.height / FRAME_HEIGHT) * 100}%`,
                                                            }}
                                                            onPointerDown={(
                                                                event,
                                                            ) =>
                                                                beginPhotoGesture(
                                                                    index,
                                                                    event,
                                                                )
                                                            }
                                                            onPointerMove={(
                                                                event,
                                                            ) =>
                                                                movePhotoGesture(
                                                                    index,
                                                                    event,
                                                                )
                                                            }
                                                            onPointerUp={(
                                                                event,
                                                            ) =>
                                                                endPhotoGesture(
                                                                    index,
                                                                    event,
                                                                )
                                                            }
                                                            onPointerCancel={(
                                                                event,
                                                            ) =>
                                                                endPhotoGesture(
                                                                    index,
                                                                    event,
                                                                )
                                                            }
                                                        >
                                                            {/*
                                                             * The slot itself is the hard clipping boundary. The
                                                             * selection outline is rendered separately above the artwork.
                                                             */}
                                                            <div className="absolute inset-0 overflow-hidden">
                                                                <img
                                                                    src={photo.preview}
                                                                    alt={`Strip photo ${index + 1}`}
                                                                    draggable={false}
                                                                    className="absolute left-1/2 top-1/2 h-full w-full select-none object-contain"
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

                                                        </div>
                                                    )
                                                },
                                            )}

                                            {/* Frame artwork */}
                                            <img
                                                src={resolveFrameSrc(
                                                    selectedFrame.src,
                                                )}
                                                alt={`Frame ${selectedFrame.id}`}
                                                className="pointer-events-none absolute inset-0 z-40 h-full w-full object-contain"
                                            />

                                            {/* Selection outline sits above the frame artwork. */}
                                            {editingPhotoIndex !== null && (
                                                <div
                                                    className="pointer-events-none absolute inset-0 z-50"
                                                    aria-hidden="true"
                                                >
                                                    {(() => {
                                                        const slot =
                                                            selectedFrame.slots[
                                                            editingPhotoIndex
                                                            ]

                                                        if (!slot) return null

                                                        return (
                                                            <div
                                                                className="absolute rounded-[2px] border-2 border-white shadow-[0_0_0_1px_rgba(69,52,45,0.18),0_3px_12px_rgba(0,0,0,0.16)]"
                                                                style={{
                                                                    left: `${(slot.x / FRAME_WIDTH) * 100}%`,
                                                                    top: `${(slot.y / FRAME_HEIGHT) * 100}%`,
                                                                    width: `${(slot.width / FRAME_WIDTH) * 100}%`,
                                                                    height: `${(slot.height / FRAME_HEIGHT) * 100}%`,
                                                                }}
                                                            />
                                                        )
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile frame arrows */}
                                        <div className="absolute inset-y-0 -left-3 z-30 flex items-center lg:hidden">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    cycleFrame(-1)
                                                }
                                                className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/45 bg-white/25 text-[#45342d] shadow-sm backdrop-blur-md active:scale-90"
                                                aria-label="Previous layout"
                                            >
                                                <ChevronLeft
                                                    size={15}
                                                    strokeWidth={1.5}
                                                />
                                            </button>
                                        </div>

                                        <div className="absolute inset-y-0 -right-3 z-30 flex items-center lg:hidden">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    cycleFrame(1)
                                                }
                                                className="mr-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/45 bg-white/25 text-[#45342d] shadow-sm backdrop-blur-md active:scale-90"
                                                aria-label="Next layout"
                                            >
                                                <ChevronRight
                                                    size={15}
                                                    strokeWidth={1.5}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Photo edit controls OUTSIDE the frame */}
                                    {editingPhotoIndex !== null && (
                                        <div
                                            className="
                                                relative
                                                z-50
                                                mt-2
                                                flex
                                                items-center
                                                gap-1
                                                rounded-full
                                                border
                                                border-white/55
                                                bg-black/25
                                                px-2
                                                py-1.5
                                                text-white
                                                shadow-[0_8px_30px_rgba(69,52,45,0.18)]
                                                backdrop-blur-2xl
                                                sm:mt-3
                                                sm:gap-1.5
                                                sm:px-2.5
                                                sm:py-2
                                            "
                                            onPointerDown={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    zoomPhoto(
                                                        editingPhotoIndex,
                                                        -0.1,
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 active:scale-90 sm:h-8 sm:w-8"
                                                aria-label="Zoom out"
                                                title="Zoom out"
                                            >
                                                <ZoomOut size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    rotatePhoto(
                                                        editingPhotoIndex,
                                                        -90,
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 active:scale-90 sm:h-8 sm:w-8"
                                                aria-label="Rotate left 90 degrees"
                                                title="Rotate left 90°"
                                            >
                                                <RotateCcw size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    resetPhoto(
                                                        editingPhotoIndex,
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 active:scale-90 sm:h-8 sm:w-8"
                                                aria-label="Reset photo"
                                                title="Reset"
                                            >
                                                <RefreshCw size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    rotatePhoto(
                                                        editingPhotoIndex,
                                                        90,
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 active:scale-90 sm:h-8 sm:w-8"
                                                aria-label="Rotate right 90 degrees"
                                                title="Rotate right 90°"
                                            >
                                                <RotateCw size={13} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    zoomPhoto(
                                                        editingPhotoIndex,
                                                        0.1,
                                                    )
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 active:scale-90 sm:h-8 sm:w-8"
                                                aria-label="Zoom in"
                                                title="Zoom in"
                                            >
                                                <ZoomIn size={13} />
                                            </button>

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Desktop layout selector */}
                        <aside
                            className="
                                hidden
                                w-[280px]
                                shrink-0
                                flex-col
                                items-center
                                lg:flex
                                lg:w-[285px]
                            "
                        >
                            <div className="w-full rounded-[24px] border border-white/45 bg-white/20 p-3 shadow-[0_10px_35px_rgba(69,52,45,0.10)] backdrop-blur-xl sm:p-4">
                                <div className="text-center">
                                    <p className="font-serif text-xs uppercase tracking-[0.24em] text-[#45342d]">
                                        Choose a layout
                                    </p>

                                    <p className="mt-1 text-[10px] text-[#45342d]/55">
                                        {photos.length} photos ·{" "}
                                        {availableFrames.length} designs
                                    </p>
                                </div>

                                <div className="mt-3 grid max-h-[52vh] grid-cols-4 gap-2 overflow-y-auto pr-1">
                                    {availableFrames.map(
                                        (frame) => {
                                            const isSelected =
                                                frame.id ===
                                                selectedFrame?.id

                                            return (
                                                <button
                                                    key={frame.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFrameId(
                                                            frame.id,
                                                        )
                                                        setEditingPhotoIndex(
                                                            null,
                                                        )
                                                    }}
                                                    className={`
                                                        relative
                                                        aspect-[1012/1300]
                                                        overflow-hidden
                                                        rounded-lg
                                                        border
                                                        bg-white/20
                                                        transition
                                                        hover:-translate-y-0.5
                                                        hover:bg-white/35
                                                        ${isSelected
                                                            ? "border-[#45342d]/70 ring-2 ring-white/80"
                                                            : "border-white/45"
                                                        }
                                                    `}
                                                >
                                                    <img
                                                        src={resolveFrameSrc(
                                                            frame.src,
                                                        )}
                                                        alt={`Layout ${frame.id}`}
                                                        className="h-full w-full object-contain"
                                                    />

                                                    {isSelected && (
                                                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/75 text-[#45342d] shadow-sm backdrop-blur-md">
                                                            <Check
                                                                size={
                                                                    11
                                                                }
                                                                strokeWidth={
                                                                    2
                                                                }
                                                            />
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        },
                                    )}
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            cycleFrame(-1)
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/25 text-[#45342d] backdrop-blur-md transition hover:bg-white/45 active:scale-90"
                                        aria-label="Previous layout"
                                    >
                                        <ChevronLeft
                                            size={15}
                                            strokeWidth={1.5}
                                        />
                                    </button>

                                    <span className="font-serif text-[9px] uppercase tracking-[0.16em] text-[#45342d]/55">
                                        {selectedFrameIndex + 1} /{" "}
                                        {availableFrames.length}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            cycleFrame(1)
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-white/25 text-[#45342d] backdrop-blur-md transition hover:bg-white/45 active:scale-90"
                                        aria-label="Next layout"
                                    >
                                        <ChevronRight
                                            size={15}
                                            strokeWidth={1.5}
                                        />
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {/* Mobile helper */}
                    <div className="relative z-40 flex shrink-0 items-center justify-center px-3 pb-1 lg:hidden">
                        <p className="w-[240px] rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-center font-serif text-[7px] uppercase tracking-[0.12em] text-[#45342d]/55 backdrop-blur-md">
                            Drag inside to adjust · pinch & twist to zoom/rotate · drag a photo out to reorder
                        </p>
                    </div>

                    {/* Bottom actions */}
                    <footer className="relative z-40 flex shrink-0 flex-col items-center justify-center gap-1 px-3 pb-2 pt-1 sm:flex-row sm:gap-3 sm:pb-5">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="
                                rounded-full
                                border
                                border-white/60
                                bg-white/50
                                px-5
                                py-2
                                text-center
                                font-serif
                                text-[10px]
                                uppercase
                                tracking-[0.16em]
                                text-[#45342d]
                                backdrop-blur-md
                                transition
                                hover:bg-white/70
                                active:scale-95
                                h-10
                                w-[240px]
                                justify-center
                                sm:h-auto
                                sm:w-auto
                                sm:px-7
                                sm:text-xs
                            "
                        >
                            ← Back
                        </button>

                        <button
                            type="button"
                            onClick={handleMakeMyStrip}
                            disabled={!selectedFrame}
                            className="
                                flex
                                items-center
                                gap-1.5
                                rounded-full
                                border
                                border-white/55
                                bg-[#a99d92]/60
                                px-5
                                py-2
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
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                                h-10
                                w-[240px]
                                justify-center
                                sm:h-auto
                                sm:w-auto
                                sm:px-8
                                sm:text-xs
                            "
                        >
                            Make My Strip
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

export default MakeStrip
