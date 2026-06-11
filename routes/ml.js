/**
 * ML Services Proxy Route
 * ========================
 * Proxies requests from the Node.js API to the Python FastAPI microservices.
 *
 * NutriMind (Nutrition):   http://localhost:8001
 * DeepInfant (Cry Analyzer): http://localhost:8002
 *
 * All routes are under /api/ml/
 */

const express = require('express')
const router = express.Router()
const http = require('http')

const NUTRIMIND_URL = process.env.NUTRIMIND_SERVICE_URL || 'http://localhost:8001'
const DEEPINFANT_URL = process.env.DEEPINFANT_SERVICE_URL || 'http://localhost:8002'

// ---------------------------------------------------------------------------
// Generic proxy helper — forwards JSON body to a Python service
// ---------------------------------------------------------------------------
function proxyJson(targetUrl, path, req, res) {
    const body = JSON.stringify(req.body)
    const url = new URL(targetUrl)

    const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
        },
    }

    const proxyReq = http.request(options, (proxyRes) => {
        let data = ''
        proxyRes.on('data', (chunk) => { data += chunk })
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode)
            res.setHeader('Content-Type', 'application/json')
            res.send(data)
        })
    })

    proxyReq.on('error', (err) => {
        console.error(`[ML Proxy] Error reaching ${targetUrl}${path}:`, err.message)
        res.status(503).json({
            error: 'ML service unavailable',
            detail: `Could not reach ${targetUrl}${path}. Make sure the Python service is running.`,
            hint: 'Run: python ml_services/start_ml_services.py'
        })
    })

    proxyReq.write(body)
    proxyReq.end()
}

// ---------------------------------------------------------------------------
// Generic proxy helper — forwards multipart/form-data (audio files)
// ---------------------------------------------------------------------------
function proxyMultipart(targetUrl, path, req, res) {
    const url = new URL(targetUrl)

    const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: path,
        method: 'POST',
        headers: req.headers,
    }

    const proxyReq = http.request(options, (proxyRes) => {
        let data = ''
        proxyRes.on('data', (chunk) => { data += chunk })
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode)
            res.setHeader('Content-Type', 'application/json')
            res.send(data)
        })
    })

    proxyReq.on('error', (err) => {
        console.error(`[ML Proxy] Error reaching ${targetUrl}${path}:`, err.message)
        res.status(503).json({
            error: 'ML service unavailable',
            detail: `Could not reach DeepInfant service at ${targetUrl}. Make sure it is running.`,
            hint: 'Run: python ml_services/start_ml_services.py'
        })
    })

    req.pipe(proxyReq)
}

// ---------------------------------------------------------------------------
// Health check — checks both services
// ---------------------------------------------------------------------------
router.get('/health', (req, res) => {
    const results = {}
    let pending = 2

    function checkService(name, baseUrl) {
        const url = new URL(baseUrl)
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: '/health',
            method: 'GET',
            timeout: 3000,
        }
        const probe = http.request(options, (r) => {
            let d = ''
            r.on('data', c => { d += c })
            r.on('end', () => {
                try { results[name] = { status: 'ok', ...JSON.parse(d) } }
                catch { results[name] = { status: 'ok' } }
                if (--pending === 0) res.json(results)
            })
        })
        probe.on('error', () => {
            results[name] = { status: 'offline', hint: 'python ml_services/start_ml_services.py' }
            if (--pending === 0) res.json(results)
        })
        probe.on('timeout', () => {
            results[name] = { status: 'timeout' }
            probe.destroy()
            if (--pending === 0) res.json(results)
        })
        probe.end()
    }

    checkService('nutrimind', NUTRIMIND_URL)
    checkService('deepinfant', DEEPINFANT_URL)
})

// ---------------------------------------------------------------------------
// NutriMind routes
// ---------------------------------------------------------------------------

/**
 * POST /api/ml/mother-meal-plan
 * Generate personalized meal plan for breastfeeding/pregnant mother
 *
 * Body: { age, height, weight, is_breastfeeding, is_pregnant, trimester, activity, number_of_meals }
 */
router.post('/mother-meal-plan', (req, res) => {
    proxyJson(NUTRIMIND_URL, '/mother-meal-plan', req, res)
})

/**
 * POST /api/ml/child-food-guide
 * Get age-appropriate food recommendations for child 6m-5yr
 *
 * Body: { child_age_months, child_weight_kg, number_of_meals, preferred_ingredients }
 */
router.post('/child-food-guide', (req, res) => {
    proxyJson(NUTRIMIND_URL, '/child-food-guide', req, res)
})

// ---------------------------------------------------------------------------
// DeepInfant route
// ---------------------------------------------------------------------------

/**
 * POST /api/ml/analyze-cry
 * Analyze baby cry audio and return classification result
 *
 * Body: multipart/form-data with 'audio' file (WAV/MP3/M4A, max 10MB)
 */
router.post('/analyze-cry', (req, res) => {
    proxyMultipart(DEEPINFANT_URL, '/analyze-cry', req, res)
})

module.exports = router
