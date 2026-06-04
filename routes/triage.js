const express = require('express')
const router = express.Router()
const { createSymptomCheck, getFacilitiesForUrgency, resolveSymptomCheck } = require('../lib/db-helpers')
const auth = require('../middleware/authMiddleware')

// ─── Rule Engine (Safety Net — Always Runs First) ─────────────────────────────

const RULES = [
  { id: 'emergency-breathing', symptoms: ['breathing'], urgencyLevel: 4, actionEn: 'Breathing difficulty is an emergency — go to hospital immediately.' },
  { id: 'emergency-convulsion', symptoms: ['convulsion'], urgencyLevel: 4, actionEn: 'Convulsion is an emergency — go to hospital immediately.' },
  { id: 'emergency-bleeding', symptoms: ['bleeding'], urgencyLevel: 4, actionEn: 'Bleeding requires immediate hospital care.' },
  { id: 'high-fever-lethargy', symptoms: ['fever', 'lethargy'], urgencyLevel: 3, actionEn: 'Fever with lethargy is serious. Go to Upazila Health Complex.' },
  { id: 'diarrhea-vomit', symptoms: ['diarrhea', 'vomit'], urgencyLevel: 3, actionEn: 'Diarrhea and vomiting together cause dehydration risk. Visit health center.' },
  { id: 'fever-alone', symptoms: ['fever'], urgencyLevel: 2, actionEn: 'Monitor fever and give fluids. See CHW if it persists over 3 days.' },
  { id: 'cough-alone', symptoms: ['cough'], urgencyLevel: 1, actionEn: 'Give lukewarm water for cough. No honey for babies under 1 year.' },
  { id: 'diarrhea-alone', symptoms: ['diarrhea'], urgencyLevel: 2, actionEn: 'Give ORS for diarrhea. Continue breastfeeding.' },
  { id: 'rash-alone', symptoms: ['rash'], urgencyLevel: 1, actionEn: 'Keep baby clean. See doctor if rash is accompanied by fever.' },
  { id: 'not-eating', symptoms: ['not_eating'], urgencyLevel: 1, actionEn: 'Give small frequent feeds. Continue breastfeeding.' },
]

const SYMPTOM_URGENCIES = {
  fever: 2, cough: 1, diarrhea: 2, rash: 1, not_eating: 1,
  breathing: 4, vomit: 2, lethargy: 3, ear_pain: 1,
  eye_issue: 1, convulsion: 4, bleeding: 4,
}

function runRuleEngine(symptoms) {
  let maxUrgency = 1
  for (const rule of RULES) {
    if (rule.symptoms.every(s => symptoms.includes(s))) {
      maxUrgency = Math.max(maxUrgency, rule.urgencyLevel)
    }
  }
  for (const s of symptoms) {
    maxUrgency = Math.max(maxUrgency, SYMPTOM_URGENCIES[s] || 1)
  }
  return maxUrgency
}

// ─── Gemini/Groq AI Integration ─────────────────────────────────────────────────────

const SYMPTOM_LABELS = {
  fever: 'Fever', cough: 'Cough', diarrhea: 'Diarrhea', rash: 'Rash',
  not_eating: 'Not Eating / Poor Feeding', breathing: 'Breathing Difficulty',
  vomit: 'Vomiting', lethargy: 'Lethargy / Weakness', ear_pain: 'Ear Pain',
  eye_issue: 'Eye Problem', convulsion: 'Convulsion / Seizure', bleeding: 'Bleeding',
}

const FALLBACK_ADVICE = {
  1: {
    immediateEn: 'Keep the child comfortable at home and monitor symptoms.',
    immediateBn: 'শিশুকে বাড়িতে আরামে রাখুন এবং লক্ষণ পর্যবেক্ষণ করুন।',
    bulletsEn: [
      'Give plenty of fluids and continue breastfeeding',
      'Keep the child warm and well-rested',
      'Visit CHW if symptoms worsen or new ones appear',
    ],
    bulletsBn: [
      'প্রচুর তরল দিন ও বুকের দুধ চালু রাখুন',
      'শিশুকে উষ্ণ ও বিশ্রামে রাখুন',
      'লক্ষণ খারাপ হলে স্বাস্থ্যকর্মীকে দেখান',
    ],
  },
  2: {
    immediateEn: 'Visit a Community Health Worker (CHW) today.',
    immediateBn: 'আজই সম্প্রদায় স্বাস্থ্যকর্মীর (CHW) কাছে যান।',
    bulletsEn: [
      'Give ORS to prevent dehydration if applicable',
      'Continue breastfeeding and small frequent feeds',
      'Go to clinic if child becomes very sleepy or refuses all feeds',
    ],
    bulletsBn: [
      'পানিশূন্যতা রোধে ওআরএস দিন',
      'বুকের দুধ ও ঘন ঘন অল্প খাবার চালু রাখুন',
      'শিশু ঘুমিয়ে পড়লে বা খাবার নিতে না চাইলে ক্লিনিকে যান',
    ],
  },
  3: {
    immediateEn: 'Go to the Upazila Health Center as soon as possible.',
    immediateBn: 'যত দ্রুত সম্ভব উপজেলা স্বাস্থ্য কমপ্লেক্সে যান।',
    bulletsEn: [
      'Do not delay — leave for health center now',
      'Give ORS sips on the way if child is conscious',
      'Bring any medicine the child has already taken',
    ],
    bulletsBn: [
      'দেরি করবেন না — এখনই স্বাস্থ্য কেন্দ্রে রওনা হন',
      'পথে শিশু সচেতন থাকলে ওআরএস দিন',
      'শিশু আগে কোনো ওষুধ খেলে সঙ্গে নিন',
    ],
  },
  4: {
    immediateEn: 'This is an EMERGENCY — go to hospital immediately!',
    immediateBn: 'এটি জরুরি অবস্থা — এখনই হাসপাতালে যান!',
    bulletsEn: [
      'Call for help or emergency transport immediately',
      'Keep child on their side if unconscious or convulsing',
      'Do not give anything by mouth if child is unconscious',
    ],
    bulletsBn: [
      'এখনই সাহায্য বা জরুরি যানবাহন ডাকুন',
      'অচেতন বা খিঁচুনি হলে শিশুকে একপাশে কাত করে রাখুন',
      'অচেতন অবস্থায় কিছু খাওয়াবেন না',
    ],
  },
}

function buildFallbackResult(symptoms, urgencyLevel) {
  const fb = FALLBACK_ADVICE[urgencyLevel] || FALLBACK_ADVICE[1]
  const labels = {
    1: 'home_care',
    2: 'visit_chw',
    3: 'upazila_hc',
    4: 'emergency',
  }
  return {
    urgencyLevel,
    urgencyLabel: labels[urgencyLevel] || 'home_care',
    immediateActionEn: fb.immediateEn,
    immediateActionBn: fb.immediateBn,
    bulletPointsEn: fb.bulletsEn,
    bulletPointsBn: fb.bulletsBn,
    aiEnhanced: false,
  }
}

async function callGroqAI(symptoms, ageMonths, ruleUrgency) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return buildFallbackResult(symptoms, ruleUrgency)
  }

  const symptomList = symptoms.map(s => SYMPTOM_LABELS[s] || s).join(', ')
  const urgencyLabels = {
    1: 'Level 1 — Mild (Home Care)',
    2: 'Level 2 — Moderate (Visit Community Health Worker)',
    3: 'Level 3 — Urgent (Go to Upazila Health Center)',
    4: 'Level 4 — Emergency (Hospital Immediately)',
  }

  const systemPrompt = `You are a pediatric triage assistant for rural Bangladesh following the IMCI (Integrated Management of Childhood Illness) protocol. Respond ONLY with valid JSON — no markdown, no explanation.`

  const userPrompt = `A child aged ${ageMonths} months presents with: ${symptomList}.
Rule-based urgency: ${urgencyLabels[ruleUrgency]}.

Return this exact JSON:
{
  "urgencyLevel": ${ruleUrgency},
  "immediateActionEn": "<one sentence: what caregiver must do RIGHT NOW>",
  "immediateActionBn": "<same in Bangla>",
  "bulletPointsEn": ["<tip 1, max 15 words>", "<tip 2, max 15 words>", "<tip 3, max 15 words>"],
  "bulletPointsBn": ["<tip 1 in Bangla>", "<tip 2 in Bangla>", "<tip 3 in Bangla>"]
}

Rules: exactly 3 bullets, urgencyLevel stays ${ruleUrgency}, IMCI Bangladesh context, mention ORS for diarrhea and breastfeeding when relevant.`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn('Groq API error:', response.status, await response.text())
      return buildFallbackResult(symptoms, ruleUrgency)
    }

    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content
    if (!text) return buildFallbackResult(symptoms, ruleUrgency)

    const parsed = JSON.parse(text)
    const labels = {
      1: 'home_care',
      2: 'visit_chw',
      3: 'upazila_hc',
      4: 'emergency',
    }

    return {
      urgencyLevel: ruleUrgency, // always trust rule engine for safety
      urgencyLabel: labels[ruleUrgency] || 'home_care',
      immediateActionEn: parsed.immediateActionEn || '',
      immediateActionBn: parsed.immediateActionBn || '',
      bulletPointsEn: (parsed.bulletPointsEn || []).slice(0, 3),
      bulletPointsBn: (parsed.bulletPointsBn || []).slice(0, 3),
      aiEnhanced: true,
    }
  } catch (err) {
    console.warn('Groq call failed, using fallback:', err)
    return buildFallbackResult(symptoms, ruleUrgency)
  }
}

// POST /api/triage - Submit triage
router.post('/', auth.required, async function (req, res, next) {
  try {
    const { symptoms, ageMonths = 12, childId, division, district, upazila } = req.body

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ error: 'Symptoms array required' })
    }

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' })
    }

    // Safety net: rule engine always runs first
    const ruleUrgency = runRuleEngine(symptoms)

    // AI enhancement
    const triageResult = await callGroqAI(symptoms, ageMonths, ruleUrgency)

    // Persist triage check session
    const savedCheck = await createSymptomCheck({
      childId: childId,
      symptoms: symptoms,
      ruleEngineLevel: ruleUrgency,
      aiUrgencyLevel: triageResult.urgencyLevel,
      urgencyLabel: triageResult.urgencyLabel,
      aiEnhanced: triageResult.aiEnhanced,
      immediateActionEn: triageResult.immediateActionEn,
      immediateActionBn: triageResult.immediateActionBn,
      bulletPointsEn: triageResult.bulletPointsEn,
      bulletPointsBn: triageResult.bulletPointsBn,
    })

    // Fetch recommended facilities for Level 3+
    let recommendedFacilities = []
    if (savedCheck.urgencyLevel >= 3) {
      recommendedFacilities = await getFacilitiesForUrgency({
        urgencyLevel: savedCheck.urgencyLevel,
        division,
        district,
        upazila,
      })
    }

    res.json({
      id: savedCheck.id,
      symptoms,
      urgencyLevel: savedCheck.urgencyLevel,
      urgencyLabel: savedCheck.urgencyLabel,
      immediateAction: {
        en: savedCheck.immediateActionEn,
        bn: savedCheck.immediateActionBn,
      },
      bulletPoints: {
        en: triageResult.bulletPointsEn,
        bn: triageResult.bulletPointsBn,
      },
      aiEnhanced: savedCheck.aiEnhanced,
      facilities: recommendedFacilities,
      timestamp: savedCheck.createdAt,
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/triage/:id/resolve - Resolve triage session
router.patch('/:id/resolve', auth.required, async function (req, res, next) {
  try {
    const { id } = req.params
    const { outcomeNote } = req.body

    const allowed = ['home_care_worked', 'visited_chw', 'visited_facility', 'admitted', 'other']
    if (!allowed.includes(outcomeNote)) {
      return res.status(400).json({ error: 'Invalid outcomeNote' })
    }

    // ruleEngineLevel, urgencyLevel, symptoms, aiEnhanced, bulletPoints are protected
    // and cannot be modified (handled inside resolveSymptomCheck helper)
    const updated = await resolveSymptomCheck(id, outcomeNote)
    res.json(updated)
  } catch (error) {
    next(error)
  }
})

module.exports = router
