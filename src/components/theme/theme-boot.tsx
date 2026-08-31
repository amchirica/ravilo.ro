const STORAGE_KEY = "ravilo-theme";

export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(STORAGE_KEY)};var t=localStorage.getItem(k);var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=t==="dark"||((t==null||t==="system")&&m);d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;
