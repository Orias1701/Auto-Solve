const script = document.createElement('script');
script.src = 'https://raw.githubusercontent.com/Orias1701/Auto-Solve/main/Tools/AutoSolve.js';
script.onload = () => {
  console.log('Script loaded successfully');
  autoSolve();
};
script.onerror = () => {
  console.error('Failed to load script');
};
document.head.appendChild(script);
