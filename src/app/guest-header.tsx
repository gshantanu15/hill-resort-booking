"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import "./guest-chrome.css";

const links = [
  ["The estate", "/#about"],
  ["Stays", "/#stays"],
  ["Enquiries", "/enquire"],
] as const;

export function GuestArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="guest-arrow">
      <path d="M3 10h13m-5-5 5 5-5 5" />
    </svg>
  );
}

export function GuestHeader({ enquiry = false }: { enquiry?: boolean }) {
  const menu = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const closeMenu = () => menu.current?.close();

  const navigation = (mobile = false) =>
    links.map(([label, href]) => (
      <Link
        key={href}
        href={href}
        prefetch={false}
        aria-current={enquiry && href === "/enquire" ? "page" : undefined}
        onClick={mobile ? closeMenu : undefined}
      >
        {label}
        {mobile && <GuestArrow />}
      </Link>
    ));

  return (
    <header className="guest-header">
      <div className="guest-chrome-inner guest-header-inner">
        <a className="skip" href="#main">
          Skip to content
        </a>
        <nav className="guest-header-links" aria-label="Main navigation">
          {navigation()}
        </nav>
        <Link className="wordmark guest-header-brand" href="/" prefetch={false}>
          Aavana <span>Estate</span>
        </Link>
        <div className="guest-header-actions">
          <Link
            className="button guest-book-action"
            href="/#stays"
            prefetch={false}
          >
            Book a stay <GuestArrow />
          </Link>
          <button
            className="guest-menu-toggle"
            type="button"
            aria-label="Open navigation"
            aria-controls="guest-menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => {
              menu.current?.showModal();
              setOpen(true);
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="guest-arrow">
              <path d="M2 6h16M2 14h16" />
            </svg>
          </button>
        </div>
      </div>
      <dialog
        className="guest-menu"
        ref={menu}
        id="guest-menu"
        aria-labelledby="guest-menu-title"
        onClose={() => setOpen(false)}
      >
        <div className="guest-chrome-inner guest-menu-inner">
          <div className="guest-menu-top">
            <span className="wordmark" id="guest-menu-title">
              Aavana <span>Estate</span>
            </span>
            <button
              className="guest-menu-toggle"
              type="button"
              aria-label="Close navigation"
              onClick={closeMenu}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="guest-arrow"
              >
                <path d="m4 4 12 12M16 4 4 16" />
              </svg>
            </button>
          </div>
          <nav aria-label="Mobile navigation">{navigation(true)}</nav>
          <div className="guest-menu-bottom">
            <p>Chikkamagaluru, Karnataka</p>
            <Link
              className="button guest-book-action"
              href="/#stays"
              prefetch={false}
              onClick={closeMenu}
            >
              Book a stay <GuestArrow />
            </Link>
          </div>
        </div>
      </dialog>
    </header>
  );
}
