const MILESTONE_DATA = [
  // ── Prenatal ──────────────────────────────────────────────────────────────
  { ageBracket: 'prenatal', domain: 'health', sortOrder: 1, textEn: 'Completed at least 1 antenatal care visit', source: 'DGHS', isKey: true },
  { ageBracket: 'prenatal', domain: 'health', sortOrder: 2, textEn: 'Received iron and folic acid tablets', source: 'DGHS', isKey: true },
  { ageBracket: 'prenatal', domain: 'health', sortOrder: 3, textEn: 'Received TT (tetanus toxoid) vaccination', source: 'EPI', isKey: true },
  { ageBracket: 'prenatal', domain: 'health', sortOrder: 4, textEn: 'Blood pressure checked in current trimester', source: 'DGHS' },
  { ageBracket: 'prenatal', domain: 'health', sortOrder: 5, textEn: 'Birth plan discussed with health worker', source: 'DGHS' },
  { ageBracket: 'prenatal', domain: 'health', sortOrder: 6, textEn: 'Emergency transport arranged for delivery', source: 'DGHS' },

  // ── 0–1 month ─────────────────────────────────────────────────────────────
  { ageBracket: '0-1m', domain: 'health',    sortOrder: 1, textEn: 'Breastfed within 1 hour of birth', source: 'WHO', isKey: true, minAgeMonths: 0, maxAgeMonths: 0 },
  { ageBracket: '0-1m', domain: 'cognitive', sortOrder: 2, textEn: 'Reacts to loud sounds (startle reflex)', source: 'WHO', minAgeMonths: 0, maxAgeMonths: 1 },
  { ageBracket: '0-1m', domain: 'social',    sortOrder: 3, textEn: "Turns head towards caregiver's voice", source: 'WHO', minAgeMonths: 0, maxAgeMonths: 1 },
  { ageBracket: '0-1m', domain: 'cognitive', sortOrder: 4, textEn: 'Briefly focuses on a face held close (20–30cm)', source: 'WHO', minAgeMonths: 0, maxAgeMonths: 1 },
  { ageBracket: '0-1m', domain: 'health',    sortOrder: 5, textEn: 'BCG and OPV0 vaccines given', source: 'EPI', isKey: true, minAgeMonths: 0, maxAgeMonths: 0 },
  { ageBracket: '0-1m', domain: 'health',    sortOrder: 6, textEn: 'Weight checked at birth and at 2 weeks', source: 'DGHS', minAgeMonths: 0, maxAgeMonths: 1 },

  // ── 1–6 months ────────────────────────────────────────────────────────────
  { ageBracket: '1-6m', domain: 'social',    sortOrder: 1, textEn: 'Smiles responsively (by 2 months)', source: 'WHO', isKey: true, minAgeMonths: 1, maxAgeMonths: 3 },
  { ageBracket: '1-6m', domain: 'motor',     sortOrder: 2, textEn: 'Holds head briefly during tummy time (by 2 months)', source: 'WHO', minAgeMonths: 1, maxAgeMonths: 3 },
  { ageBracket: '1-6m', domain: 'language',  sortOrder: 3, textEn: 'Coos and makes sounds (by 3 months)', source: 'WHO', minAgeMonths: 2, maxAgeMonths: 4 },
  { ageBracket: '1-6m', domain: 'cognitive', sortOrder: 4, textEn: 'Tracks moving objects with eyes (by 3 months)', source: 'WHO', minAgeMonths: 2, maxAgeMonths: 4 },
  { ageBracket: '1-6m', domain: 'motor',     sortOrder: 5, textEn: 'Holds a rattle when placed in hand (by 4 months)', source: 'WHO', minAgeMonths: 3, maxAgeMonths: 5 },
  { ageBracket: '1-6m', domain: 'social',    sortOrder: 6, textEn: 'Laughs and squeals (by 4 months)', source: 'WHO', minAgeMonths: 3, maxAgeMonths: 5 },
  { ageBracket: '1-6m', domain: 'motor',     sortOrder: 7, textEn: 'Reaches for nearby objects (by 5 months)', source: 'WHO', minAgeMonths: 4, maxAgeMonths: 6 },
  { ageBracket: '1-6m', domain: 'health',    sortOrder: 8, textEn: '6-week vaccines complete (Pentavalent, PCV, OPV)', source: 'EPI', isKey: true, minAgeMonths: 1, maxAgeMonths: 2 },

  // ── 6–12 months ───────────────────────────────────────────────────────────
  { ageBracket: '6-12m', domain: 'motor',    sortOrder: 1, textEn: 'Sits without support (by 7 months)', source: 'WHO', isKey: true, minAgeMonths: 6, maxAgeMonths: 9 },
  { ageBracket: '6-12m', domain: 'language', sortOrder: 2, textEn: 'Babbles (ba-ba, ma-ma sounds) by 8 months', source: 'WHO', minAgeMonths: 6, maxAgeMonths: 9 },
  { ageBracket: '6-12m', domain: 'motor',    sortOrder: 3, textEn: 'Stands holding furniture (by 9 months)', source: 'WHO', minAgeMonths: 8, maxAgeMonths: 12 },
  { ageBracket: '6-12m', domain: 'social',   sortOrder: 4, textEn: 'Shows stranger anxiety (by 9 months)', source: 'WHO', minAgeMonths: 7, maxAgeMonths: 12 },
  { ageBracket: '6-12m', domain: 'motor',    sortOrder: 5, textEn: 'Picks up small objects with finger and thumb pincer grip (by 9–10 months)', source: 'WHO', isKey: true, minAgeMonths: 8, maxAgeMonths: 12 },
  { ageBracket: '6-12m', domain: 'social',   sortOrder: 6, textEn: 'Waves bye-bye or claps hands (by 10 months)', source: 'WHO', minAgeMonths: 9, maxAgeMonths: 12 },
  { ageBracket: '6-12m', domain: 'language', sortOrder: 7, textEn: 'First words (mama/baba with meaning) by 12 months', source: 'WHO', isKey: true, minAgeMonths: 10, maxAgeMonths: 14 },
  { ageBracket: '6-12m', domain: 'health',   sortOrder: 8, textEn: 'MR1 vaccine given at 9 months', source: 'EPI', isKey: true, minAgeMonths: 9, maxAgeMonths: 10 },

  // ── 1–2 years ─────────────────────────────────────────────────────────────
  { ageBracket: '1-2y', domain: 'motor',     sortOrder: 1, textEn: 'Walks independently (by 12–15 months)', source: 'WHO', isKey: true, minAgeMonths: 12, maxAgeMonths: 18 },
  { ageBracket: '1-2y', domain: 'language',  sortOrder: 2, textEn: 'Uses 10+ words by 18 months', source: 'WHO', isKey: true, minAgeMonths: 15, maxAgeMonths: 20 },
  { ageBracket: '1-2y', domain: 'cognitive', sortOrder: 3, textEn: 'Points to 2–3 body parts when named (by 18 months)', source: 'WHO', minAgeMonths: 15, maxAgeMonths: 20 },
  { ageBracket: '1-2y', domain: 'motor',     sortOrder: 4, textEn: 'Feeds self with spoon (by 18 months)', source: 'WHO', minAgeMonths: 15, maxAgeMonths: 20 },
  { ageBracket: '1-2y', domain: 'social',    sortOrder: 5, textEn: 'Imitates household tasks (by 18 months)', source: 'WHO', minAgeMonths: 14, maxAgeMonths: 20 },
  { ageBracket: '1-2y', domain: 'language',  sortOrder: 6, textEn: 'Uses 2-word phrases by 24 months ("more milk")', source: 'WHO', isKey: true, minAgeMonths: 20, maxAgeMonths: 26 },
  { ageBracket: '1-2y', domain: 'cognitive', sortOrder: 7, textEn: 'Stacks 3–4 blocks (by 18 months)', source: 'WHO', minAgeMonths: 15, maxAgeMonths: 20 },
  { ageBracket: '1-2y', domain: 'health',    sortOrder: 8, textEn: 'MR2 and JE vaccines given', source: 'EPI', isKey: true, minAgeMonths: 15, maxAgeMonths: 18 },

  // ── 2–3 years ─────────────────────────────────────────────────────────────
  { ageBracket: '2-3y', domain: 'motor',     sortOrder: 1, textEn: 'Runs and climbs stairs with support', source: 'WHO', minAgeMonths: 24, maxAgeMonths: 30 },
  { ageBracket: '2-3y', domain: 'language',  sortOrder: 2, textEn: 'Uses 3-word sentences by 2.5 years', source: 'WHO', isKey: true, minAgeMonths: 24, maxAgeMonths: 32 },
  { ageBracket: '2-3y', domain: 'language',  sortOrder: 3, textEn: 'Names at least 6 familiar objects', source: 'WHO', minAgeMonths: 24, maxAgeMonths: 30 },
  { ageBracket: '2-3y', domain: 'cognitive', sortOrder: 4, textEn: 'Engages in pretend play (feeding a doll)', source: 'WHO', minAgeMonths: 24, maxAgeMonths: 30 },
  { ageBracket: '2-3y', domain: 'cognitive', sortOrder: 5, textEn: 'Knows own first name and age', source: 'WHO', minAgeMonths: 24, maxAgeMonths: 36 },
  { ageBracket: '2-3y', domain: 'social',    sortOrder: 6, textEn: 'Shows interest in other children', source: 'WHO', minAgeMonths: 24, maxAgeMonths: 36 },
  { ageBracket: '2-3y', domain: 'motor',     sortOrder: 7, textEn: 'Draws a vertical line when shown', source: 'WHO', minAgeMonths: 24, maxAgeMonths: 36 },

  // ── 3–5 years ─────────────────────────────────────────────────────────────
  { ageBracket: '3-5y', domain: 'motor',     sortOrder: 1, textEn: 'Hops on one foot for 2 seconds (by 4 years)', source: 'WHO', minAgeMonths: 36, maxAgeMonths: 54 },
  { ageBracket: '3-5y', domain: 'language',  sortOrder: 2, textEn: 'Speaks in full sentences (4–5 words) by 4 years', source: 'WHO', isKey: true, minAgeMonths: 36, maxAgeMonths: 54 },
  { ageBracket: '3-5y', domain: 'motor',     sortOrder: 3, textEn: 'Can copy a circle or cross shape', source: 'WHO', minAgeMonths: 36, maxAgeMonths: 48 },
  { ageBracket: '3-5y', domain: 'cognitive', sortOrder: 4, textEn: 'Understands the concept of "same" and "different"', source: 'WHO', minAgeMonths: 36, maxAgeMonths: 54 },
  { ageBracket: '3-5y', domain: 'cognitive', sortOrder: 5, textEn: 'Can name 4+ colours by 4 years', source: 'WHO', minAgeMonths: 36, maxAgeMonths: 54 },
  { ageBracket: '3-5y', domain: 'social',    sortOrder: 6, textEn: 'Plays cooperatively in group games', source: 'WHO', minAgeMonths: 36, maxAgeMonths: 60 },
  { ageBracket: '3-5y', domain: 'motor',     sortOrder: 7, textEn: 'Can dress self with minimal help (by 5 years)', source: 'WHO', minAgeMonths: 48, maxAgeMonths: 60 },
  { ageBracket: '3-5y', domain: 'cognitive', sortOrder: 8, textEn: 'Follows 2-step instructions reliably', source: 'WHO', isKey: true, minAgeMonths: 36, maxAgeMonths: 54 },
  { ageBracket: '3-5y', domain: 'health',    sortOrder: 9, textEn: 'Vitamin A supplementation received (national round)', source: 'EPI', isKey: true },
]

async function seedMilestones(prisma) {
  const existing = await prisma.milestone.count()
  if (existing > 0) {
    console.log('  [milestones] already seeded, skipping')
    return
  }

  await prisma.milestone.createMany({ data: MILESTONE_DATA })
  console.log(`  [milestones] seeded ${MILESTONE_DATA.length} milestones across 7 age brackets`)
}

module.exports = { seedMilestones }
