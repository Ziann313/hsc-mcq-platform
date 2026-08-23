import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-center text-sm font-bold text-white shadow-xl"
      role="status"
      aria-live="polite"
    >
      <WifiOff size={18} aria-hidden="true" />
      <span>You’re offline. Saved progress may be limited until you reconnect.</span>
    </div>
  );
}
