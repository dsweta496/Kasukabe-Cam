const stickerFiles = import.meta.glob(
    "../assets/stickers/**/*.png",
    {
        eager: true,
        query: "?url",
        import: "default",
    },
)

const prettifyName = (filename) => {
    return filename
        .replace(/\.png$/i, "")
        .replace(/\(\d+\)/g, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const STICKER_CATALOG = Object.entries(
    stickerFiles,
).map(([path, src], index) => {
    const parts = path.split("/")
    const category = parts[parts.length - 2]
    const filename = parts[parts.length - 1]

    return {
        id: `sticker-${index}`,
        name: prettifyName(filename),
        category,
        src,
    }
})

export const STICKER_CATEGORIES = [
    "Cute Animals",
    "Pokemon",
    "Foliage",
    "Shinchan",
]