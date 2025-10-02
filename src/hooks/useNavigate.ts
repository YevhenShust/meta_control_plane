/**
 * Hook to navigate to a different path in the application.
 * Updates the URL query parameter and triggers the app's path handling.
 */
export function useNavigate() {
  return (path: string[]) => {
    const url = new URL(window.location.href);
    if (path.length > 0) {
      const val = path.map(s => encodeURIComponent(s)).join('/');
      url.searchParams.set('path', val);
    } else {
      url.searchParams.delete('path');
    }
    window.history.pushState(null, '', url.toString());
    // Trigger popstate to update the app
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
}
