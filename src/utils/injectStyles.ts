/**
 * Injects CSS styles into the document head.
 * Ensures styles are only added once, even if multiple widget instances are rendered.
 */
const STYLE_ID = 'msw-ui-widget-styles';

export function injectStyles(css: string): void {
  // Check if styles are already injected
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  // Create style element
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;

  // Append to head
  document.head.appendChild(style);
}
