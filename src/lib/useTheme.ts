"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Koyu modu <html class="dark"> üzerinden okur/yazar. Sınıf değişimini
 * MutationObserver ile dinlediğimiz için efekt içinde setState çağrısı gerekmez.
 */
export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setDark = (next: boolean) => {
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("yepas.theme", next ? "dark" : "light");
    } catch {
      // depolama kapalıysa tercih yalnızca bu oturumda geçerli olur
    }
  };

  return { dark, setDark, toggle: () => setDark(!getSnapshot()) };
}
