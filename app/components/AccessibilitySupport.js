"use client";
import { useEffect } from "react";

// Compatibility adapter for the existing modal forms. Keeps their business handlers
// intact while supplying consistent keyboard behaviour and background isolation.
export default function AccessibilitySupport() {
  useEffect(() => {
    let current = null, restore = null, priorInert = [], priorAttributes = [], serial = 0;
    let lastFocused = document.activeElement;
    const visible = node => node instanceof HTMLElement && node.getClientRects().length && !node.closest('[inert]');
    const focusable = root => [...root.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(n => visible(n) && !n.disabled && n.tabIndex >= 0);
    const release = () => {
      for (const [node, value] of priorInert) node.inert = value;
      priorInert = [];
      for (const [node, name, value] of priorAttributes) value === null ? node.removeAttribute(name) : node.setAttribute(name, value);
      priorAttributes = [];
      const old = restore;
      current = null; restore = null;
      if (old?.isConnected && visible(old)) old.focus();
    };
    const sync = () => {
      const mobile = matchMedia('(max-width: 1024px)').matches;
      const sidebar = document.querySelector('.shell-sidebar');
      if (sidebar) sidebar.inert = mobile && !sidebar.closest('.drawer-open');
      const dialogs = [...document.querySelectorAll('.modal-backdrop > .editor-modal, .modal-backdrop > .modal, .modal-backdrop > form, .modal-backdrop > .modal-content')].filter(visible);
      const drawer = matchMedia('(max-width: 1024px)').matches ? document.querySelector('.drawer-open .shell-sidebar') : null;
      const next = dialogs.at(-1) || drawer;
      if (next === current) return;
      release();
      if (!next) return;
      current = next; restore = lastFocused;
      priorAttributes = ['role','aria-modal','tabindex','aria-labelledby','aria-label'].map(name => [next, name, next.getAttribute(name)]);
      next.setAttribute('role', 'dialog'); next.setAttribute('aria-modal', 'true'); next.tabIndex = -1;
      const title = next === drawer ? null : next.querySelector('h2,h3');
      if (title) { if (!title.id) title.id = 'accessible-dialog-title-' + (++serial); next.setAttribute('aria-labelledby', title.id); }
      else if (!next.getAttribute('aria-label')) next.setAttribute('aria-label', drawer === next ? 'Primary navigation' : 'Details');
      for (let node = next; node.parentElement && node.parentElement !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling === node || sibling.classList.contains('drawer-scrim') || !(sibling instanceof HTMLElement)) continue;
          priorInert.push([sibling, sibling.inert]); sibling.inert = true;
        }
      }
      (focusable(next)[0] || next).focus();
    };
    const focus = event => {
      if (current && !current.contains(event.target)) { (focusable(current)[0] || current).focus(); return; }
      lastFocused = event.target;
    };
    const key = event => {
      if (!current) return;
      if (event.key === 'Tab') {
        const targets = focusable(current), first = targets[0], last = targets.at(-1);
        if (!first) { event.preventDefault(); current.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      if (event.key === 'Escape') {
        const close = [...current.querySelectorAll('button')].find(b => /^(close|close navigation|cancel|×)$/i.test((b.getAttribute('aria-label') || b.textContent).trim()));
        if (close && !close.disabled) { event.preventDefault(); close.click(); }
      }
    };
    const resize = () => sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('focusin', focus); document.addEventListener('keydown', key);
    window.addEventListener('resize', resize); sync();
    return () => { observer.disconnect(); document.removeEventListener('focusin', focus); document.removeEventListener('keydown', key); window.removeEventListener('resize', resize); release(); };
  }, []);
  return null;
}
