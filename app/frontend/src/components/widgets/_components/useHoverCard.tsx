"use client";

import { Popover } from "radix-ui";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

// Hover delays, as the glossary cards have: open after a short rest, close a little after the pointer leaves the target and its card.
const OPEN_DELAY = 150;
const CLOSE_DELAY = 250;

/** How the card was last opened: a mouse resting (`hover`), Enter or Space on the target (`key`), a tap (`tap`) or keyboard focus on it (`focus`). */
type Opener = "hover" | "key" | "tap" | "focus";

/** Above the Full screen overlay (z-100). Looks like an `InfoTip` card. */
const CARD =
  "z-[110] w-fit rounded-sm border border-rule-strong bg-popover px-3 py-2 font-sans text-sm leading-snug font-normal text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0";

/**
 * One shared card (a Radix Popover anchored by `virtualRef` to the active target, not a Popover per target) for the
 * elements matching `selector` inside a root that carries the returned `handlers` (found by delegation, so a split of
 * 2,315 words has a handful of handlers, not 2,315). It opens on a mouse resting 150 ms on a target (closing 250 ms
 * after the pointer leaves it and, for an `interactive` card, the card), on a click, on a tap (a second tap on the open
 * target closes it) and, with `focusOpens`, on focus; Escape or a tap elsewhere closes it. For an `interactive` card
 * (one with a link) Enter or Space on a target opens it with the focus on its first link, and Escape returns the focus to
 * the target. A card that is not `interactive` ignores the pointer (`pointer-events-none`), so it never blocks a click.
 * `focusTarget` maps the element that got the focus to the target to open the card on (the default is the target
 * itself); a focus that is not keyboard focus (`:focus-visible`) then does not open it. `resetKey` closes the card when it
 * changes (a new split replaces the target elements); `onShow` runs when a target is shown; `children(el)` is the card's content.
 */
export function useHoverCard({
  selector,
  enabled = true,
  resetKey,
  interactive = false,
  focusOpens = false,
  focusTarget,
  label,
  onShow,
  onOpen,
  suppressed = false,
  children,
}: {
  selector: string;
  enabled?: boolean;
  resetKey: unknown;
  interactive?: boolean;
  focusOpens?: boolean;
  focusTarget?: (el: HTMLElement) => HTMLElement | null;
  label: (el: HTMLElement) => string;
  onShow?: (el: HTMLElement) => void;
  /** Runs when this card opens, so a second card in the same root can be `suppressed` (kept closed) while this one is open. */
  onOpen?: () => void;
  suppressed?: boolean;
  children: (el: HTMLElement) => ReactNode;
}) {
  const [shown, setShown] = useState<{ el: HTMLElement; key: unknown } | null>(null);
  const active = shown && shown.key === resetKey && !suppressed ? shown : null;
  const activeEl = active?.el ?? null;
  const anchor = useMemo(() => ({ current: activeEl }), [activeEl]);
  const lastEl = useRef<HTMLElement | null>(null);
  const how = useRef<Opener>("hover");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const card = useRef<HTMLDivElement>(null);
  // The last pointer gesture on a target: for a tap, whether its card was already open when it began.
  const gesture = useRef({ touch: false, wasOpen: false });
  useEffect(() => () => clearTimeout(timer.current), []);

  const targetOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest?.<HTMLElement>(selector) ?? null;
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  const show = (el: HTMLElement, by: Opener) => {
    clearTimeout(timer.current);
    how.current = by;
    lastEl.current = el;
    onOpen?.();
    setShown((a) => (a?.el === el && a.key === resetKey ? a : { el, key: resetKey }));
    onShow?.(el);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setShown(null);
  };
  const hideLater = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(hide, CLOSE_DELAY);
  };
  const keepOpen = () => clearTimeout(timer.current);

  const handlers = enabled
    ? {
        onPointerOver: (e: React.PointerEvent) => {
          const el = targetOf(e.target);
          if (!el || !mouse(e)) return;
          if (active?.el === el) return keepOpen();
          keepOpen();
          timer.current = setTimeout(() => show(el, "hover"), OPEN_DELAY);
        },
        onPointerOut: (e: React.PointerEvent) => {
          const el = targetOf(e.target);
          if (el && mouse(e) && el !== targetOf(e.relatedTarget)) hideLater();
        },
        onPointerDown: (e: React.PointerEvent) => {
          const el = targetOf(e.target);
          if (el) gesture.current = { touch: !mouse(e), wasOpen: active?.el === el };
        },
        onClick: (e: React.MouseEvent) => {
          const el = targetOf(e.target);
          if (!el) return;
          if (e.detail === 0) {
            // Enter or Space: open (with the focus in the card, if it has a link, so the link is a Tab or Enter away).
            show(el, "key");
            if (interactive) requestAnimationFrame(() => card.current?.querySelector<HTMLElement>("a")?.focus());
          } else if (gesture.current.touch && gesture.current.wasOpen) hide();
          else show(el, gesture.current.touch ? "tap" : "hover");
        },
        onFocus: (e: React.FocusEvent) => {
          if (!focusOpens) return;
          const from = e.target as HTMLElement;
          if (focusTarget && !from.matches(":focus-visible")) return;
          const t = focusTarget ? focusTarget(from) : targetOf(from);
          if (t) show(t, "focus");
        },
        onBlur: (e: React.FocusEvent) => {
          if (focusOpens && (focusTarget ? focusTarget(e.target as HTMLElement) : targetOf(e.target))) hideLater();
        },
      }
    : {};

  const node = enabled ? (
    <Popover.Root open={active !== null} onOpenChange={(open) => !open && hide()}>
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        <Popover.Content
          ref={card}
          side="top"
          sideOffset={4}
          collisionPadding={20}
          aria-label={activeEl ? label(activeEl) : undefined}
          className={interactive ? CARD : `${CARD} pointer-events-none`}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            // Back to the target after a keyboard open (Escape); a mouse or tap close leaves the focus alone.
            if (how.current === "key") lastEl.current?.focus();
          }}
          // Focus moving to another target must not close a card that has just opened on it (blur and Escape close it).
          onFocusOutside={interactive ? undefined : (e) => e.preventDefault()}
          onPointerEnter={(e) => mouse(e) && keepOpen()}
          onPointerLeave={(e) => mouse(e) && hideLater()}
        >
          {activeEl && children(activeEl)}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  ) : null;

  return { handlers, node, active: activeEl, show, hide };
}

/** Runs each handler that is given, in order (one root carries the handlers of several cards and of the roving focus). */
export function chain<E>(...fns: (((e: E) => void) | undefined)[]) {
  return (e: E) => fns.forEach((f) => f?.(e));
}
