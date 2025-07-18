// Suppress React DevTools in development
if (typeof window !== 'undefined') {
  // Block React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function() {};
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = function() {};
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberUnmount = function() {};
  }
  
  // Prevent preload errors
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'LINK' && node.rel === 'preload' && 
            node.href && node.href.includes('react.dev/link/react-devtools')) {
          node.remove();
        }
      });
    });
  });
  
  observer.observe(document.head, { childList: true });
}