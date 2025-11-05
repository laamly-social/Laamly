import { usePWAInstall } from '../../hooks/usePWAInstall';

/**
 * PWA Install Button Component
 * Shows an install button when the app is installable
 * Only renders on browsers that support PWA installation (not Firefox)
 */
export function PWAInstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Don't show button if app is already installed or not installable
  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      console.log('PWA installation accepted');
    } else {
      console.log('PWA installation declined');
    }
  };

  return (
    <button
      onClick={handleInstall}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
      aria-label="Install Laamly app"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Install App
    </button>
  );
}
