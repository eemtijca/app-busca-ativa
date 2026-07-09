import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/assets/cores.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './rotas';

const app = createApp(App);

app.use(router);

app.mount('#app');
