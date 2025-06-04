// frontend/js/core/pwaInstall.js - Module for PWA installation logic

let deferredPrompt = null;
const installButtonId = 'installPwaButton'; // Assuming this is the ID of your install button

/**
 * Initializes the PWA installation flow by listening for the 'beforeinstallprompt' event.
 */
function initializePwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    console.log('beforeinstallprompt event fired. PWA can be installed.');

    // Show the install button
    const installButton = document.getElementById(installButtonId);
    if (installButton) {
      installButton.style.display = 'block'; // Or 'inline-block', 'flex', etc., depending on layout
    } else {
      console.warn(`PWA Install button with ID '${installButtonId}' not found.`);
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    // Optionally, hide the install button if it's still visible for some reason
    const installButton = document.getElementById(installButtonId);
    if (installButton) {
      installButton.style.display = 'none';
    }
    // Clear the deferredPrompt as it's no longer needed
    deferredPrompt = null;
  });
}

/**
 * Handles the click event of the PWA install button.
 * Prompts the user to install the PWA.
 */
async function handleInstallButtonClick() {
  const installButton = document.getElementById(installButtonId);

  if (!deferredPrompt) {
    console.error('PWA install prompt not available. deferredPrompt is null.');
    if (installButton) {
      // Optionally hide the button if the prompt isn't available,
      // though it should only be visible if deferredPrompt is set.
      installButton.style.display = 'none';
    }
    return;
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  try {
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA installation accepted by the user.');
    } else {
      console.log('PWA installation dismissed by the user.');
    }
  } catch (error) {
    console.error('Error during PWA installation prompt:', error);
  }

  // We've used the prompt, and can't use it again, discard it
  deferredPrompt = null;

  // Hide the install button
  if (installButton) {
    installButton.style.display = 'none';
  }
}

export { initializePwaInstall, handleInstallButtonClick };
