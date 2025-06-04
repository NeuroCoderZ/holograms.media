// frontend/js/core/auth.js

// Import necessary Firebase Auth modules and custom services.
import { auth, GoogleAuthProvider } from './firebaseInit.js';
import { signInWithPopup, signOut, onAuthStateChanged, getIdToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { syncUserAuth } from './services/apiService.js'; // Import the service to sync user with backend

// --- DOM Element References ---
// These variables will hold references to HTML elements related to authentication UI.
// They are initially null and set dynamically after the DOM is loaded.
let signInButton = null;
let signOutButton = null;
let userStatusDiv = null;

/**
 * Sets the DOM elements for authentication UI from their respective IDs.
 * This function should be called once the DOM is ready (e.g., from uiManager.js or main.js).
 * Attaches event listeners to the sign-in and sign-out buttons.
 * @param {string} signInBtnId - The DOM ID of the Google Sign-In button.
 * @param {string} signOutBtnId - The DOM ID of the Sign-Out button.
 * @param {string} userStatusId - The DOM ID of the div/span displaying user status.
 */
export function setAuthDOMElements(signInBtnId, signOutBtnId, userStatusId) {
    signInButton = document.getElementById(signInBtnId);
    signOutButton = document.getElementById(signOutBtnId);
    userStatusDiv = document.getElementById(userStatusId);

    // Attach event listeners to the buttons if they exist in the DOM.
    if (signInButton) {
        signInButton.addEventListener('click', signInWithGoogle);
    }
    if (signOutButton) {
        signOutButton.addEventListener('click', userSignOut);
    }
}

/**
 * Initiates the Google Sign-In process using Firebase Authentication.
 * Opens a pop-up window for the user to select their Google account.
 * Handles success by updating UI and logs errors.
 */
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider(); // Create a new Google Auth Provider instance.
    try {
        // Open the sign-in pop-up and wait for the result.
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // Update UI to reflect the signed-in user's display name or email.
        if (userStatusDiv) userStatusDiv.textContent = `Signed in as: ${user.displayName || user.email}`;
        // The ID token will be automatically handled by the onAuthStateChanged observer.
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
        // Display error message in the UI.
        if (userStatusDiv) userStatusDiv.textContent = `Error: ${error.message}`;
    }
}

/**
 * Signs out the currently authenticated user from Firebase.
 * Updates UI to reflect the signed-out state.
 */
export async function userSignOut() {
    try {
        await signOut(auth);
        // Update UI to indicate no user is signed in.
        if (userStatusDiv) userStatusDiv.textContent = 'Signed out.';
    } catch (error) {
        console.error("Error during sign out:", error);
    }
}

/**
 * Initializes an observer for Firebase Authentication state changes.
 * This observer runs whenever the user's sign-in state changes (e.g., sign-in, sign-out, token refresh).
 * It updates the UI and retrieves the Firebase ID token, passing it to a provided callback function.
 * @param {function(string|null): Promise<void>} callbackAfterToken - A callback function that receives the Firebase ID Token (or null if signed out).
 *   This callback is typically used to synchronize the user with the backend or perform other authenticated actions.
 */
export function initAuthObserver(callbackAfterToken) {
    const userAvatarElement = document.getElementById('userAvatar');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in. Update UI accordingly.
            if (userStatusDiv) userStatusDiv.textContent = `User: ${user.displayName || user.email}`;

            if (userAvatarElement) {
                if (user.photoURL) {
                    userAvatarElement.src = user.photoURL;
                    userAvatarElement.style.display = 'block';
                } else {
                    userAvatarElement.style.display = 'none';
                }
            }

            if (signInButton) signInButton.style.display = 'none'; // Hide sign-in button
            if (signOutButton) signOutButton.style.display = 'block'; // Show sign-out button

            try {
                // Get the Firebase ID token for the current user. This token is used for backend authentication.
                const idToken = await getIdToken(user);
                // console.log("User ID Token:", idToken); // Uncomment for debugging token
                // Call the provided callback with the ID token.
                if (callbackAfterToken && typeof callbackAfterToken === 'function') {
                    await callbackAfterToken(idToken); // Await the callback if it's async
                }
            } catch (error) {
                console.error("Error getting ID token:", error);
            }

        } else {
            // User is signed out. Update UI accordingly.
            if (userStatusDiv) userStatusDiv.textContent = 'No user signed in.';

            if (userAvatarElement) {
                userAvatarElement.style.display = 'none';
            }

            if (signInButton) signInButton.style.display = 'block'; // Show sign-in button
            if (signOutButton) signOutButton.style.display = 'none'; // Hide sign-out button
            // Call the provided callback with null, indicating no user token.
            if (callbackAfterToken && typeof callbackAfterToken === 'function') {
                await callbackAfterToken(null); // Await the callback if it's async
            }
        }
    });
}

/**
 * Handles the received Firebase ID token by sending it to the backend's authentication synchronization function.
 * This function acts as the `callbackAfterToken` for `initAuthObserver`.
 * @param {string|null} token - The Firebase ID Token string, or null if the user is signed out.
 */
export async function handleTokenForBackend(token) {
    if (token) {
        console.log("Auth.js: Received token. Attempting to send to backend auth_sync function.", token.substring(0,20) + "...");
        try {
            // Call the backend API service to synchronize user authentication.
            const response = await syncUserAuth(token);
            console.log("Auth.js: Backend sync successful:", response);
        } catch (error) {
            console.error("Auth.js: Error syncing user with backend:", error);
        }
    } else {
        console.log("Auth.js: User signed out or no token received.");
    }
}
