import http from 'k6/http'
import { sleep, check } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

const BASE_URL = 'https://cadsphere.vercel.app'

export default function () {
  const home = http.get(`${BASE_URL}/`)
  check(home, { 'homepage 200': r => r.status === 200 })

  const login = http.get(`${BASE_URL}/login`)
  check(login, { 'login page 200': r => r.status === 200 })

  const files = http.get(`${BASE_URL}/api/files`)
  check(files, { 'api/files returns 401': r => r.status === 401 })

  const dashboard = http.get(`${BASE_URL}/dashboard`, { redirects: 0 })
  check(dashboard, { 'dashboard redirects': r => r.status === 302 || r.status === 307 })

  sleep(1)
}
