var GROQ_API_KEY = process.env.GROQ_API_KEY
var GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
var GROQ_MODEL = 'llama-3.3-70b-versatile'

var SYSTEM_PROMPT = `You are ShishuCare's Myth Buster, a helpful assistant specializing in child health myths and facts for Bangladesh. You fact-check common misconceptions about infant and child care, including:
- Breastfeeding, colostrum, formula
- Vaccination and vaccine safety
- Introduction of solid foods and water
- Baby walkers, teething, developmental milestones
- Traditional remedies like gripe water, honey, rice water
- Screen time, sunlight exposure, jaundice treatment

Be concise and compassionate. Start answers with MYTH, FACT, or PARTIAL MYTH/FACT when applicable. For questions outside your scope, recommend consulting a health worker or calling the national health helpline 16000. Keep responses under 150 words.`

exports.chat = async function (req, res, next) {
    try {
        var message = req.body.message
        var history = req.body.history || []

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'message is required' })
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({ message: 'Groq API key is not configured' })
        }

        var messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-10).map(function (m) {
                return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text }
            }),
            { role: 'user', content: message.trim() },
        ]

        var response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({ model: GROQ_MODEL, messages: messages, max_tokens: 300, temperature: 0.3 }),
        })

        if (!response.ok) {
            throw new Error(`Groq API error ${response.status}`)
        }

        var data = await response.json()
        var reply = data.choices[0].message.content

        res.json({ reply: reply })
    } catch (err) {
        next(err)
    }
}
