import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Renders children directly into document.body.
// Needed for fixed overlays (modals, drawers, chat) placed inside ancestors that
// use backdrop-filter — those create a containing block and break position: fixed.
export const Portal: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
};
