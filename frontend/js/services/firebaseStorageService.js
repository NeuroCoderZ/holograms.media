// frontend/js/services/firebaseStorageService.js
import { storage } from '../core/firebaseInit.js'; // Get the initialized storage instance
import { ref, uploadBytesResumable, getMetadata } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";

/**
 * Generates a simple unique ID for a chunk using current timestamp and a random number.
 * A proper UUID library would be more robust for ensuring global uniqueness if needed.
 * @param {string} filename - The original filename, to add a bit more uniqueness.
 * @returns {string} A pseudo-unique chunk ID.
 */
function generateChunkId(filename) {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7); // Short random string
    // Sanitize filename part to remove problematic characters
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 50);
    return `${timestamp}_${randomSuffix}_${sanitizedFilename}`;
}

/**
 * Uploads a file to Firebase Storage in a user-specific path.
 *
 * @param {File} file The file object to upload.
 * @param {string} firebaseUserId The UID of the Firebase user.
 * @returns {Promise<string>} A promise that resolves with the full Firebase Storage path
 *                            of the uploaded file, or rejects with an error.
 */
export async function uploadFileToFirebaseStorage(file, firebaseUserId) {
    if (!file) {
        return Promise.reject(new Error("File object is required."));
    }
    if (!firebaseUserId) {
        return Promise.reject(new Error("Firebase User ID is required."));
    }

    const chunkId = generateChunkId(file.name);
    const storagePath = `user_uploads/${firebaseUserId}/${chunkId}_${file.name}`;

    const storageRef = ref(storage, storagePath);

    const customMetadata = {
        firebaseUserId: firebaseUserId,
        originalFilename: file.name,
        clientTimestamp: new Date().toISOString()
        // contentType is automatically handled by Firebase Storage based on file extension or file.type
        // but can be explicitly set if needed: contentType: file.type
    };

    console.log(`Starting upload for: ${file.name} to path: ${storagePath}`);

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, { customMetadata });

        uploadTask.on('state_changed',
            (snapshot) => {
                // Observe state change events such as progress, pause, and resume
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload for ${file.name} is ${progress}% done`);
                switch (snapshot.state) {
                    case 'paused':
                        console.log(`Upload for ${file.name} is paused`);
                        break;
                    case 'running':
                        console.log(`Upload for ${file.name} is running`);
                        break;
                }
            },
            (error) => {
                // Handle unsuccessful uploads
                console.error(`Upload failed for ${file.name}:`, error);
                reject(error);
            },
            async () => {
                // Handle successful uploads on complete
                try {
                    const uploadedFileMetadata = await getMetadata(uploadTask.snapshot.ref);
                    console.log(`Upload successful for ${file.name}. Full path: ${uploadedFileMetadata.fullPath}`);
                    resolve(uploadedFileMetadata.fullPath);
                } catch (metaError) {
                    console.error(`Failed to get metadata for ${file.name}:`, metaError);
                    // Fallback to snapshot.ref.fullPath if getMetadata fails for some reason, though it shouldn't
                    reject(metaError);
                }
            }
        );
    });
}
