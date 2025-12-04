import React, { useState, useEffect } from 'react';

const COOKIE_NAME = 'cookie_consent';

export default function CookieConsentBanner({ onConsent }: { onConsent: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_NAME);
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_NAME, 'true');
    setVisible(false);
    onConsent();
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_NAME, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 flex justify-between items-center z-50 shadow-lg">
      <span>
        We use cookies to improve your experience and analyze site usage. By accepting, you consent to our use of cookies for analytics.
      </span>
      <div className="ml-4 flex gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleAccept}
        >
          Accept
        </button>
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={handleDecline}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
