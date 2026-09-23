const DB_NAME = "kasukabe-cam"
const DB_VERSION = 1
const STORE_NAME = "photos"

const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = () => {
            const database = request.result

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                })
            }
        }

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(request.error)
        }
    })
}

export const savePhotos = async (photos) => {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readwrite",
        )

        const store = transaction.objectStore(STORE_NAME)

        store.clear()

        photos.forEach((photo, index) => {
            store.put({
                id: photo.id || `photo-${index}-${Date.now()}`,
                blob: photo.file,
                order: index,
            })
        })

        transaction.oncomplete = () => {
            database.close()
            resolve()
        }

        transaction.onerror = () => {
            database.close()
            reject(transaction.error)
        }
    })
}

export const getPhotos = async () => {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readonly",
        )

        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => {
            const photos = request.result
                .sort((a, b) => a.order - b.order)
                .map((photo) => ({
                    id: photo.id,
                    file: photo.blob,
                    preview: URL.createObjectURL(photo.blob),
                }))

            database.close()
            resolve(photos)
        }

        request.onerror = () => {
            database.close()
            reject(request.error)
        }
    })
}

export const removePhoto = async (id) => {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readwrite",
        )

        const store = transaction.objectStore(STORE_NAME)

        store.delete(id)

        transaction.oncomplete = () => {
            database.close()
            resolve()
        }

        transaction.onerror = () => {
            database.close()
            reject(transaction.error)
        }
    })
}

export const clearPhotos = async () => {
    const database = await openDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readwrite",
        )

        const store = transaction.objectStore(STORE_NAME)

        store.clear()

        transaction.oncomplete = () => {
            database.close()
            resolve()
        }

        transaction.onerror = () => {
            database.close()
            reject(transaction.error)
        }
    })
}