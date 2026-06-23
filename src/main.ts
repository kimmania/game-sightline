import { registerSW } from 'virtual:pwa-register';
import { bootstrap } from './app';
import './style.css';

registerSW({ immediate: true });

bootstrap().catch((error) => {
  console.error('Failed to start app:', error);
});
