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
      // Make sure it has the base class for PWA button styling if it doesn't already
      if (!installButton.classList.contains('pwa-install-button')) {
        installButton.classList.add('pwa-install-button');
      }
      installButton.classList.add('visible');
      console.log('PWA install button shown.');
    } else {
      console.warn(`PWA Install button with ID '${installButtonId}' not found.`);
    }
  });

  const installButton = document.getElementById(installButtonId);
  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.error('PWA install prompt not available. deferredPrompt is null.');
        // Optionally hide the button if the prompt isn't available,
        // though it should only be visible if deferredPrompt is set.
        installButton.classList.remove('visible');
        return;
      }

      // Show the install prompt
      deferredPrompt.prompt();
      console.log('Install prompt shown to user.');

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
      installButton.classList.remove('visible');
      console.log('PWA install button hidden after prompt.');
    });
  } else {
      // This warning is already covered above if button not found for showing,
      // but good to have if logic changes.
      console.warn(`PWA Install button with ID '${installButtonId}' not found for click listener attachment.`);
  }

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    // Optionally, hide the install button if it's still visible for some reason
    const installButtonElem = document.getElementById(installButtonId);
    if (installButtonElem) {
      installButtonElem.classList.remove('visible');
    }
    // Clear the deferredPrompt as it's no longer needed
    deferredPrompt = null;
  });
  console.log('PWA Install event listeners initialized.');
}

// handleInstallButtonClick is now integrated into initializePwaInstall
export { initializePwaInstall };
