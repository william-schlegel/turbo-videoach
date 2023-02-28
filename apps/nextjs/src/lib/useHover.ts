import { RefObject, useEffect, useState, type MutableRefObject } from "react";

type MaybeRef<T> = T | MutableRefObject<T>;

/**
 *
 * Detect if a dom element is hovered
 *
 * @param target - The element to listen to
 * @returns
 *
 * Example:
 *
 * const ref = useRef<HTMLDivElement | null>(null)
 *  const isHovered = useHover(ref)
 *  return (
 *    <div ref={ref}>
 *      {isHovered ? 'Hovered' : 'Not Hovered'}
 *    </div>
 *  )
 *
 */
export function useHover(target: MaybeRef<EventTarget | null>) {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = unRef(target);

    if (!el) return;

    const onMouseEnter = () => setIsHovered(true);
    const onMouseLeave = () => setIsHovered(false);

    el.addEventListener("mouseenter", onMouseEnter);
    el.addEventListener("mouseleave", onMouseLeave);

    return () => {
      el.removeEventListener("mouseenter", onMouseEnter);
      el.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [target]);

  return isHovered;
}

function unRef<T = HTMLElement>(target: MaybeRef<T>): T {
  const element = isRef(target)
    ? (target as MutableRefObject<T>).current
    : (target as T);

  return element;
}

const isRef = (obj: unknown): boolean =>
  obj !== null &&
  typeof obj === "object" &&
  Object.prototype.hasOwnProperty.call(obj, "current");

type Event = MouseEvent | TouchEvent;

export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: Event) => void,
) => {
  useEffect(() => {
    const listener = (event: Event) => {
      const el = ref?.current;
      if (!el || el.contains((event?.target as Node) || null)) {
        return;
      }

      handler(event); // Call the handler only if the click is outside of the element passed.
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]); // Reload only if ref or handler changes
};
