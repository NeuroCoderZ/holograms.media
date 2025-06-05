// frontend/js/services/firebaseStorageService.js
import { getPresignedUrl } from './apiService.js'; // Import the new API function

/**
 * Uploads a file to Cloudflare R2 using a presigned URL obtained from the backend.
 *
 * @param {File} file The file object to upload.
 * @param {string} firebaseUserId The UID of the Firebase user (passed to backend for key generation).
 * @param {string} idToken The Firebase ID token for authorizing the backend request.
 * @returns {Promise<string>} A promise that resolves with the R2 object key of the uploaded file,
 *                            or rejects with an error.
 */
export async function uploadFileToR2(file, firebaseUserId, idToken) {
    if (!file) {
        return Promise.reject(new Error("File object is required."));
    }
    if (!firebaseUserId) { // Though firebaseUserId is mainly for backend to structure the key
        return Promise.reject(new Error("Firebase User ID is required for context."));
    }
    if (!idToken) {
        return Promise.reject(new Error("Firebase ID token is required."));
    }

    console.log(`[firebaseStorageService-R2] Starting R2 upload process for: ${file.name}`);

    try {
        // 1. Get presigned URL from the backend
        console.log(`[firebaseStorageService-R2] Requesting presigned URL for ${file.name}, type: ${file.type}`);
        const presignedData = await getPresignedUrl(file.name, file.type, idToken);
        const { url: presignedUrl, fields, object_key: objectKey } = presignedData;

        console.log(`[firebaseStorageService-R2] Received presigned URL for ${objectKey}. Uploading to: ${presignedUrl}`);

        // 2. Create FormData and append fields from presigned POST data
        const formData = new FormData();
        for (const key in fields) {
            formData.append(key, fields[key]);
        }
        // Append the file. The key for the file must be 'file',
        // as this is a common expectation for S3 presigned POSTs.
        // If your backend's generate_presigned_post specifies a different field name for the file, adjust here.
        formData.append('file', file);

        console.log(`[firebaseStorageService-R2] FormData prepared. Initiating upload to R2 for ${objectKey}`);

        // 3. Perform the POST request to R2
        const r2Response = await fetch(presignedUrl, {
            method: 'POST',
            body: formData,
            // IMPORTANT: Do NOT set Content-Type header manually for FormData.
            // The browser will set it correctly, including the boundary.
        });

        if (!r2Response.ok) {
            // Try to get error message from R2 response if any
            let r2ErrorText = await r2Response.text(); // Or .text() if XML
            console.error(`[firebaseStorageService-R2] R2 upload failed for ${objectKey}. Status: ${r2Response.status}`, r2ErrorText);
            throw new Error(`R2 upload failed: ${r2Response.statusText}. Details: ${r2ErrorText}`);
        }

        console.log(`[firebaseStorageService-R2] Upload successful for ${objectKey} to R2. Status: ${r2Response.status}`);

        // A successful S3 presigned POST upload usually returns a 204 No Content or 200 OK.
        // The object_key (or full R2 path/URL if preferred) is returned to the caller.
        // For now, returning objectKey is consistent with what the backend provides.
        // You might construct a full URL if needed: `https://your-r2-public-domain.com/${objectKey}`
        return objectKey;

    } catch (error) {
        console.error(`[firebaseStorageService-R2] Error during R2 upload for ${file.name}:`, error);
        // Re-throw the error to be caught by the calling function (e.g., in uiManager)
        throw error;
    }
}
