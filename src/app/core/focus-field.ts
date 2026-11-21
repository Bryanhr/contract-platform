/** Scroll a field into view (label + control), then focus without a second jump. */
export async function focusField(target: string | HTMLElement | null | undefined) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!(el instanceof HTMLElement)) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const region =
    el.closest<HTMLElement>('.field, .filter-field, .pending-item') ??
    el.closest('label')?.parentElement ??
    el;
  const scroller = region.closest('.content');
  const pad = 32;

  if (scroller instanceof HTMLElement) {
    const delta = region.getBoundingClientRect().top - scroller.getBoundingClientRect().top - pad;
    if (Math.abs(delta) > 2) {
      // DOM typings still return void; newer browsers may return a Promise.
      await Promise.resolve(
        scroller.scrollBy({
          top: delta,
          behavior: reduce ? 'auto' : 'smooth',
        }) as void | Promise<void>,
      );
      if (!reduce) await settleScroll(scroller);
    }
  } else {
    await Promise.resolve(
      region.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
        inline: 'nearest',
      }) as void | Promise<void>,
    );
  }

  el.focus({ preventScroll: true });
}

function settleScroll(scroller: HTMLElement) {
  return new Promise<void>((resolve) => {
    let idle = 0;

    function done() {
      window.clearTimeout(idle);
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('scrollend', done);
      resolve();
    }

    function onScroll() {
      window.clearTimeout(idle);
      idle = window.setTimeout(done, 120);
    }

    idle = window.setTimeout(done, 120);
    scroller.addEventListener('scroll', onScroll);
    scroller.addEventListener('scrollend', done, { once: true });
  });
}
