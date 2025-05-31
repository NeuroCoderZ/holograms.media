// frontend/js/core/auth.js
import { auth, GoogleAuthProvider } from './firebaseInit.js';
import { signInWithPopup, signOut, onAuthStateChanged, getIdToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { syncUserAuth } from './services/apiService.js'; // Import the new service

// DOM Elements (to be updated by main.js or uiManager.js after they are added to index.html)
let signInButton = null;
let signOutButton = null;
let userStatusDiv = null;

// Function to set DOM elements (called from main.js or uiManager.js)
export function setAuthDOMElements(signInBtnId, signOutBtnId, userStatusId) {
    signInButton = document.getElementById(signInBtnId);
    signOutButton = document.getElementById(signOutBtnId);
    userStatusDiv = document.getElementById(userStatusId);

    // Add event listeners once elements are set
    if (signInButton) {
        signInButton.addEventListener('click', signInWithGoogle);
    }
    if (signOutButton) {
        signOutButton.addEventListener('click', userSignOut);
    }
}

// Sign in with Google
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        if (userStatusDiv) userStatusDiv.textContent = `Signed in as: ${user.displayName || user.email}`;
        // Token will be handled by onAuthStateChanged
    } catch (error) {
        console.error("Error during sign in:", error);
        if (userStatusDiv) userStatusDiv.textContent = `Error: ${error.message}`;
    }
}

// Sign out
export async function userSignOut() {
    try {
        await signOut(auth);
        if (userStatusDiv) userStatusDiv.textContent = 'Signed out.';
    } catch (error) {
        console.error("Error during sign out:", error);
    }
}

// Auth state observer
export function initAuthObserver(callbackAfterToken) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            if (userStatusDiv) userStatusDiv.textContent = `User: ${user.displayName || user.email}`;
            if (signInButton) signInButton.style.display = 'none';
            if (signOutButton) signOutButton.style.display = 'block';

            try {
                const idToken = await getIdToken(user);
                // console.log("User ID Token:", idToken); // For debugging
                if (callbackAfterToken && typeof callbackAfterToken === 'function') {
                    callbackAfterToken(idToken); // Pass token to a callback e.g. to send to backend
                }
            } catch (error) {
                console.error("Error getting ID token:", error);
            }

        } else {
            // User is signed out
            if (userStatusDiv) userStatusDiv.textContent = 'No user signed in.';
            if (signInButton) signInButton.style.display = 'block';
            if (signOutButton) signOutButton.style.display = 'none';
            if (callbackAfterToken && typeof callbackAfterToken === 'function') {
                    callbackAfterToken(null); // No token
                }
        }
    });
}

// This function will be passed as a callback to initAuthObserver
export async function handleTokenForBackend(token) { // Made async
    if (token) {
        console.log("Auth.js: Received token. Attempting to send to backend auth_sync function.", token.substring(0,20) + "...");
        try {
            const response = await syncUserAuth(token);
            console.log("Auth.js: Backend sync successful:", response);
        } catch (error) {
            console.error("Auth.js: Error syncing user with backend:", error);
        }
    } else {
        console.log("Auth.js: User signed out or no token received.");
    }
}
