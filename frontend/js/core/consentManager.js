// frontend/js/core/consentManager.js

const CONSENT_STORAGE_KEY = 'userConsentGiven';
const consentModalId = 'consent-modal';
const consentCheckboxId = 'consent-checkbox';
const consentAcceptBtnId = 'consent-accept-btn';

/**
 * Checks if the user has previously given consent.
 * @returns {boolean} True if consent was given, false otherwise.
 */
function hasUserGivenConsent() {
  return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
}

/**
 * Shows the consent modal.
 */
function showConsentModal() {
  const modal = document.getElementById(consentModalId);
  if (modal) {
    modal.style.display = 'flex'; // Assuming .modal uses flex for centering
    console.log('Consent modal shown.');
  } else {
    console.error('Consent modal element not found.');
  }
}

/**
 * Hides the consent modal.
 */
function hideConsentModal() {
  const modal = document.getElementById(consentModalId);
  if (modal) {
    modal.style.display = 'none';
    console.log('Consent modal hidden.');
  }
}

/**
 * Sets the consent flag in localStorage.
 */
function setUserConsent() {
  localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
  console.log('User consent stored in localStorage.');
}

/**
 * Initializes the consent mechanism.
 * Shows the modal if consent has not been given.
 * Sets up event listeners for the modal's interactive elements.
 * Returns a Promise that resolves when consent is given or if it was already given.
 */
export function initializeConsentManager() {
  return new Promise((resolve) => {
    if (hasUserGivenConsent()) {
      console.log('User consent already given.');
      resolve();
      return;
    }

    const modal = document.getElementById(consentModalId);
    const checkbox = document.getElementById(consentCheckboxId);
    const acceptBtn = document.getElementById(consentAcceptBtnId);

    if (!modal || !checkbox || !acceptBtn) {
      console.error('Consent modal interactive elements not found. Cannot enforce consent.');
      // Resolve immediately if modal elements are missing, to not block the app,
      // but this is an error state.
      resolve();
      return;
    }

    // Show the modal
    showConsentModal();

    // Enable/disable accept button based on checkbox state
    acceptBtn.disabled = !checkbox.checked; // Initial state

    checkbox.addEventListener('change', () => {
      acceptBtn.disabled = !checkbox.checked;
    });

    // Handle accept button click
    acceptBtn.addEventListener('click', () => {
      if (checkbox.checked) {
        setUserConsent();
        hideConsentModal();
        resolve();
      }
    });
    console.log('Consent manager initialized and modal displayed (if needed).');
  });
}
