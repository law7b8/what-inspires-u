// Shared by HudControls' camera button and PlusMenu's "screenshot" option
// so both take an identical, clean shot instead of two slightly different
// implementations drifting apart.
//
// Hides every HUD piece that knows about data-hud-hidden (PlusMenu, the
// Header, Hero's fixed footer — each fades itself out via a rule in its
// own module.css keyed off this attribute; see HudControls.jsx) for the
// duration of the capture, then restores whatever the attribute was set to
// beforehand — so calling this never clobbers the user's own HUD-hidden
// toggle state. Callers are still responsible for hiding their OWN visible
// chrome (the button just clicked, the menu it lives in) before calling
// this, since that isn't covered by data-hud-hidden.
export async function captureCleanScreenshot() {
    const root = document.documentElement;
    const hadAttr = root.hasAttribute('data-hud-hidden');
    root.setAttribute('data-hud-hidden', 'true');
    try {
        // let the opacity fade (0.25–0.3s across the various HUD pieces)
        // actually finish before html2canvas reads the page
        await new Promise((resolve) => setTimeout(resolve, 320));

        // loaded on demand — html2canvas is a fairly large library only
        // this action needs, so it never costs everyone else a bigger
        // initial bundle
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(document.body, {
            backgroundColor: null,
            useCORS: true,
            scale: window.devicePixelRatio || 1,
        });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `tmp3o-${Date.now()}.png`;
        a.click();
    } finally {
        if (!hadAttr) root.removeAttribute('data-hud-hidden');
    }
}
