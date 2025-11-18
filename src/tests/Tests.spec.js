import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas
export const getPostsDuration = new Trend('get_posts_duration', true);
export const statusCodeRate = new Rate('status_code_ok');

export const options = {
  thresholds: {
    // 90% das respostas abaixo de 6800ms
    get_posts_duration: ['p(90)<6800'],
    // Menos de 25% das requisições retornando erro
    http_req_failed: ['rate<0.25']
  },
  stages: [
    // Rampa de 7 até 92 VU's, 3.5 min = 210 sec
    { duration: '30s', target: 7 }, // Inicia 7
    { duration: '90s', target: 50 }, // Aumento gradual
    { duration: '60s', target: 92 }, // Bate 92 VU's
    { duration: '30s', target: 92 } // Segura até completar 3.5min
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = 'https://jsonplaceholder.typicode.com';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(`${baseUrl}/posts`, params);

  getPostsDuration.add(res.timings.duration);

  statusCodeRate.add(res.status === OK);

  check(res, {
    'GET Posts - Status 200': () => res.status === OK,
    'GET Posts - Resposta abaixo de 6800ms': () => res.timings.duration < 6800
  });
}
