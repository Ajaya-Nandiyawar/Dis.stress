import axios from 'axios';
import { CONFIG } from '../constants/config';

const client = axios.create({
    baseURL: CONFIG.BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
