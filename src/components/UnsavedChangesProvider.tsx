"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type UnsavedChangesContextValue = {
  isDirty: () => boolean;
  clearDirty: () => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>({
  isDirty: () => false,
  clearDirty: () => {},
});

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

// Tracks whether the current page has an editable form with unsaved input,
// so the back button can warn before discarding it. Deliberately only
// counts forms with a visible submit button — auto-submitting controls
// like status dropdowns or the search box either have no submit button or
// aren't inside a <form> at all, so they never mark the page dirty.
export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    dirtyRef.current = false;
  }, [pathname]);

  useEffect(() => {
    function isTrackedForm(target: EventTarget | null) {
      if (!(target instanceof Element)) return null;
      const form = target.closest("form");
      if (!form || !form.querySelector('button[type="submit"]')) return null;
      return form;
    }

    function handleInput(e: Event) {
      if (isTrackedForm(e.target)) dirtyRef.current = true;
    }

    function handleSubmit(e: Event) {
      if (isTrackedForm(e.target)) dirtyRef.current = false;
    }

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleInput, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const value: UnsavedChangesContextValue = {
    isDirty: () => dirtyRef.current,
    clearDirty: () => {
      dirtyRef.current = false;
    },
  };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}
