/**
 * Utility to convert canvas elements inside a container to static images.
 * This is crucial for rendering Canvas-based charts (like Canvas 2D/3D) in printable documents.
 */
export async function renderCanvasToImage(container: HTMLElement): Promise<void> {
  const canvases = Array.from(container.querySelectorAll('canvas'));

  for (const canvas of canvases) {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'Static Chart';

      // Copy classes and inline styles from the canvas to keep visual presentation intact
      img.className = canvas.className;
      const cssText = canvas.style.cssText;
      if (cssText) {
        img.style.cssText = cssText;
      }

      // Preserve dimensions
      if (canvas.width) {
        img.width = canvas.width / (window.devicePixelRatio || 1);
      }
      if (canvas.height) {
        img.height = canvas.height / (window.devicePixelRatio || 1);
      }

      // Replace the canvas in the DOM tree with the static image
      if (canvas.parentNode) {
        canvas.parentNode.replaceChild(img, canvas);
      }
    } catch (error) {
      console.error('Failed to convert canvas to static image:', error);
    }
  }

  // Wait for layout updates to settle in the DOM
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}
