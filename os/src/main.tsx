import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import MobileShell from './mobile/MobileShell';
import { startForwarding } from './forward';
import { isPhone } from './phone';

startForwarding();

// A phone opening /os/ gets the phone shell; the iMac's screen in the 3D scene (an iframe) and desktop browsers get the
// window OS. Decided once, at load: turning a phone keeps it a phone (touch, one side <= 600), and a desktop window
// resized across 600 px changes over on the next reload.
const phone = window.parent === window && isPhone(window.innerWidth, window.innerHeight, window.matchMedia('(pointer: coarse)').matches);

createRoot(document.getElementById('root')!).render(<StrictMode>{phone ? <MobileShell /> : <App />}</StrictMode>);
