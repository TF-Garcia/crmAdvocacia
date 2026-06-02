import { RefObject, useEffect, useState } from "react";

export function useNearViewport<T extends Element>(
  ref: RefObject<T>,
  rootMargin = "400px",
) {
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element || isNearViewport) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isNearViewport, ref, rootMargin]);

  return isNearViewport;
}
