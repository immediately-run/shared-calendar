// Size class. The host is the source of truth for the surface it rendered us
// into (`useFormFactor`), but off-host it reports a 1280px desktop, so a media
// query backs it up for plain `vite dev` and for narrow desktop panes.
import { useEffect, useState } from 'react';
import { useFormFactor } from '@immediately-run/sdk/formFactor';

const QUERY = '(max-width: 640px)';

export function useIsMobile(): boolean {
  const ff = useFormFactor();
  const [narrow, setNarrow] = useState(() => {
    try {
      return window.matchMedia(QUERY).matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ff.class === 'mobile' || narrow || ff.width < 641;
}
