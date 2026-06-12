var OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
var OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'

var SYSTEM_PROMPT = `You are NurtureAI, a compassionate child health assistant for ShishuCare — a child and maternal health platform for Bangladesh. You give warm, practical advice on:
- Baby feeding: breastfeeding, formula, complementary foods by age
- Sleep patterns and safe sleep practices
- Common infant illnesses: fever, cold, diarrhea, rashes, teething
- Growth and developmental milestones
- Vaccination schedule (Bangladesh EPI)
- General newborn and infant care tips

Rules you must always follow:
- Be warm, concise, and reassuring
- Keep responses under 150 words
- Never prescribe medicines or give dosage information
- For danger signs (convulsions, difficulty breathing, severe dehydration, high fever in newborns), immediately say: go to the nearest hospital now
- Always recommend consulting a doctor or CHCP for symptoms that concern you
- Reference WHO and Bangladesh DGHS guidelines where relevant`

exports.chat = async function (req, res, next) {
    try {
        var message = req.body.message
        var history = req.body.history || []

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'message is required' })
        }

        var messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-10).map(function (m) {
                return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text }
            }),
            { role: 'user', content: message.trim() },
        ]

        var ac = new AbortController()
        var timer = setTimeout(function () { ac.abort() }, 90000)

        var response
        try {
            response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: OLLAMA_MODEL, messages: messages, stream: false }),
                signal: ac.signal,
            })
        } catch (fetchErr) {
            clearTimeout(timer)
            if (fetchErr.name === 'AbortError') {
                return res.status(504).json({ message: 'Ollama request timed out after 90 seconds' })
            }
            return res.status(503).json({ message: `Cannot reach Ollama at ${OLLAMA_BASE_URL} — is it running? (${fetchErr.message})` })
        }
        clearTimeout(timer)

        if (!response.ok) {
            var errText = await response.text().catch(function () { return '' })
            return res.status(502).json({ message: `Ollama error ${response.status}: ${errText}` })
        }

        var data = await response.json()
        var reply = data.message?.content

        if (!reply) {
            return res.status(502).json({ message: 'Unexpected Ollama response format', raw: data })
        }

        res.json({ reply: reply })
    } catch (err) {
        next(err)
    }
}
