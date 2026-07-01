import { supabaseServer } from '@/lib/supabaseServer';

type DbVideo = {
  id: string;
  title: string;
  description: string | null;
  source_channel: string | null;
  language: string | null;
  duration_min: number | null;
  view_count: string | null;
  like_count: string | null;
  comment_count: string | null;
  notes: string | null;
  import_intent: string | null;
};

type ModelResult = {
  topic_name: string;
  subtopic_name: string | null;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Unknown';
  difficulty_score_1to5: number;
  tags: string[];
  prerequisites_text: string | null;
  confidence: number;
  notes: string | null;
};

type OpenAIOutputText = { type: 'output_text'; text: string };
type OpenAIOutputJson = { type: 'output_json'; json: unknown };
type OpenAIOutputItem = { content?: unknown };
type OpenAIResponses = { output?: unknown };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeTag(t: string) {
  return t.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9 -]/g, '');
}

const MIN_DURATION_MINUTES = Number(process.env.MIN_DURATION_MINUTES ?? '5');
const NEW_TOPIC_CONFIDENCE_OVERRIDE = Number(process.env.NEW_TOPIC_CONFIDENCE_OVERRIDE ?? '0.85');

function normalizeTopicKey(t: string): string {
  return t.toLowerCase().trim().replace(/\s+/g, ' ');
}

function extractImportIntent(notes: string | null): string | null {
  if (!notes) return null;
  const m = /(?:^|\s)import_intent\s*:\s*([^|\n\r]+)(?:\||$)/i.exec(notes);
  const v = (m?.[1] ?? '').trim();
  return v.length ? v : null;
}

function isGamingIntent(intent: string | null): boolean {
  if (!intent) return false;
  const x = intent.toLowerCase();
  // Intentionally avoid matching generic "game" to prevent false positives (e.g. "endgame", "game theory").
  const patterns: RegExp[] = [
    /\bgaming\b/i,
    /\bgameplay\b/i,
    /\blet's play\b/i,
    /\bwalkthrough\b/i,
    /\bspeedrun\b/i,
    /\bgamedev\b/i,
    /\bgame development\b/i,
    /\bunity\b/i,
    /\bunreal\b/i,
    /\bminecraft\b/i,
    /\broblox\b/i,
    /\bfortnite\b/i,
    /\bvalorant\b/i,
    /\bcsgo\b/i,
    /\bcounter-?strike\b/i,
    /\bleague of legends\b/i,
    /\bgenshin\b/i,
    /\bpokemon\b/i,
    /\bnintendo\b/i,
    /\bsteam\b/i,
    /\bxbox\b/i,
    /\bplaystation\b/i,
    /\bps5\b/i,
  ];
  return patterns.some((re) => re.test(x));
}

function isLikelyNonLearning(title: string, description: string | null): boolean {
  const t = `${title} ${(description ?? '')}`.toLowerCase();

  // Strong learning signals override weak format noise such as "clip" inside a longer educational title.
  const learningSignals = [
    'tutorial',
    'course',
    'full course',
    'lesson',
    'lecture',
    'explained',
    'explanation',
    'how to',
    'learn',
    'for beginners',
    'beginner',
    'intermediate',
    'advanced',
    'introduction to',
    'fundamentals',
    'crash course',
  ];
  const looksLearning = learningSignals.some((k) => t.includes(k));

  // Always low-signal formats unless the metadata clearly describes learning content.
  const alwaysBad = [
    'trailer',
    'teaser',
    'reaction',
    'reacts to',
    'highlights',
    'clip',
    'montage',
    'meme',
  ];

  if (!looksLearning && alwaysBad.some((k) => t.includes(k))) return true;

  // Gaming-specific formats. These are only treated as non-learning when the text
  // also looks like it is about games and does not clearly signal educational intent.
  const gamingFormat = ['gameplay', "let's play", 'walkthrough', 'speedrun'];
  const gamingHints = [
    'gaming',
    'minecraft',
    'roblox',
    'fortnite',
    'elden ring',
    'call of duty',
    'cod ',
    'valorant',
    'league of legends',
    'lol ',
    'csgo',
    'counter-strike',
    'genshin',
    'pokemon',
    'nintendo',
    'switch',
    'ps5',
    'playstation',
    'xbox',
    'steam',
  ];

  const looksGaming = gamingHints.some((k) => t.includes(k));
  const looksGamingFormat = gamingFormat.some((k) => t.includes(k));

  return looksGaming && looksGamingFormat && !looksLearning;
}

async function canonicalizeTopicName(
  topicName: string,
  cache: Map<string, string | null>
): Promise<{ name: string; known: boolean }> {
  const key = normalizeTopicKey(topicName);
  if (!key) return { name: topicName, known: false };

  if (cache.has(key)) {
    const v = cache.get(key);
    return v ? { name: v, known: true } : { name: topicName, known: false };
  }

  // Canonical topics should come from the canonical registry, not from coverage views.
  // coverage is an output of publishing, so using it as a gate creates circular blocking.
  const { data, error } = await supabaseServer
    .from('canonical_topics')
    .select('topic_name')
    .ilike('topic_name', key)
    .maybeSingle();

  if (error) {
    cache.set(key, null);
    return { name: topicName, known: false };
  }

  const canonical = (data?.topic_name ?? null) as string | null;
  cache.set(key, canonical);

  return canonical ? { name: canonical, known: true } : { name: topicName, known: false };
}

function buildPrompt(v: DbVideo) {
  return `
You are classifying a YouTube learning video for a learning-path catalog.

Context:
- This video was retrieved as a candidate for the topic request: ${JSON.stringify((v.import_intent ?? extractImportIntent(v.notes)) ?? '')}
- If the content clearly does NOT belong to that requested topic, reflect that in \`notes\` and lower \`confidence\`.

Rules:
- topic_name: broad searchable topic like "Java Programming", "Data Structures", "Microeconomics".
- subtopic_name: optional like "OOP", "Recursion", "Graph Algorithms".
- level: intended audience.
- difficulty_score_1to5: 1 easiest, 5 hardest.
- tags: 5-12 short lowercase tags, comma-free, no duplicates.
- prerequisites_text: max 1-2 sentences or null.
- confidence: 0..1 how sure you are.
- notes: uncertainty/flags or null.

Video metadata:
- title: ${JSON.stringify(v.title)}
- channel: ${JSON.stringify(v.source_channel)}
- language_hint: ${JSON.stringify(v.language)}
- duration_min: ${JSON.stringify(v.duration_min)}
- views: ${JSON.stringify(v.view_count)}
- likes: ${JSON.stringify(v.like_count)}
- comments: ${JSON.stringify(v.comment_count)}

description:
${JSON.stringify((v.description ?? '').slice(0, 4000))}
`.trim();
}

function extractStructuredOutput(resp: OpenAIResponses): unknown | null {
  const out = resp.output;
  if (!Array.isArray(out)) return null;

  for (const item of out) {
    const it = item as OpenAIOutputItem;
    const content = it?.content;
    if (!Array.isArray(content)) continue;

    for (const c of content) {
      if (typeof c !== 'object' || c === null) continue;

      const asJson = c as Partial<OpenAIOutputJson>;
      if (asJson.type === 'output_json' && 'json' in asJson) return asJson.json ?? null;

      const asText = c as Partial<OpenAIOutputText>;
      if (asText.type === 'output_text' && typeof asText.text === 'string') {
        const t = asText.text.trim();
        if (!t) continue;
        try {
          return JSON.parse(t);
        } catch {}
      }
    }
  }

  return null;
}

function validateResult(x: unknown): { ok: true; val: ModelResult } | { ok: false; error: string } {
  if (typeof x !== 'object' || x === null) return { ok: false, error: 'not_object' };
  const o = x as Record<string, unknown>;

  const topic_name = typeof o.topic_name === 'string' ? o.topic_name.trim() : '';
  if (!topic_name) return { ok: false, error: 'missing_topic_name' };

  const subtopic_name =
    o.subtopic_name === null ? null : typeof o.subtopic_name === 'string' ? o.subtopic_name.trim() : null;

  const levelRaw = typeof o.level === 'string' ? o.level : 'Unknown';
  const level =
    levelRaw === 'Beginner' || levelRaw === 'Intermediate' || levelRaw === 'Advanced' || levelRaw === 'Unknown'
      ? levelRaw
      : 'Unknown';

  const diffRaw = typeof o.difficulty_score_1to5 === 'number' ? o.difficulty_score_1to5 : NaN;
  const difficulty_score_1to5 = Number.isFinite(diffRaw) ? clamp(Math.round(diffRaw), 1, 5) : 3;

  const tagsRaw = Array.isArray(o.tags) ? o.tags : [];
  const tags = tagsRaw
    .filter((t): t is string => typeof t === 'string')
    .map(normalizeTag)
    .filter((t) => t.length > 0)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, 12);

  if (tags.length < 3) return { ok: false, error: 'tags_too_few' };

  const prerequisites_text =
    o.prerequisites_text === null
      ? null
      : typeof o.prerequisites_text === 'string'
      ? o.prerequisites_text.trim().slice(0, 240)
      : null;

  const confidenceRaw = typeof o.confidence === 'number' ? o.confidence : NaN;
  const confidence = Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : 0;

  const notes = o.notes === null ? null : typeof o.notes === 'string' ? o.notes.trim().slice(0, 240) : null;

  return { ok: true, val: { topic_name, subtopic_name, level, difficulty_score_1to5, tags, prerequisites_text, confidence, notes } };
}

async function callOpenAI(prompt: string): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('missing OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.2,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'deepdive_video_classification',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              topic_name: { type: 'string' },
              subtopic_name: { type: ['string', 'null'] },
              level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced', 'Unknown'] },
              difficulty_score_1to5: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 12 },
              prerequisites_text: { type: ['string', 'null'] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              notes: { type: ['string', 'null'] },
            },
            required: ['topic_name','subtopic_name','level','difficulty_score_1to5','tags','prerequisites_text','confidence','notes'],
          },
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`openai_error:${await res.text()}`);

  const json = (await res.json()) as OpenAIResponses;
  const structured = extractStructuredOutput(json);
  if (structured === null) throw new Error('openai_no_structured_output');

  return structured;
}

export async function classifyQueued(args: { limit: number; threshold: number }): Promise<{
  processed: number;
  published: number;
  rejected: number;
  failed: number;
}> {
  const limit = clamp(args.limit, 1, 200);
  const threshold = args.threshold;

  const { data, error } = await supabaseServer
    .from('videos')
    .select('id,title,description,source_channel,language,duration_min,view_count,like_count,comment_count,notes,import_intent')
    .eq('status', 'queued')
    // Prioritize newly imported rows. Legacy queued rows with null created_at should not block fresh imports.
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`db_read_error:${error.message}`);
  const videos = (data ?? []) as DbVideo[];

  const topicCache = new Map<string, string | null>();

  let published = 0;
  let rejected = 0;
  let failed = 0;

  for (const v of videos) {
    try {
      const raw = await callOpenAI(buildPrompt(v));
      const vr = validateResult(raw);

      if (!vr.ok) {
        const { error: updErr } = await supabaseServer
          .from('videos')
          .update({ status: 'failed', is_active: false, notes: `validate_failed:${vr.error}` })
          .eq('id', v.id);
        if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
        failed++;
        continue;
      }

      const r = vr.val;

      // Fix 4: stricter publish gate, but keep it practical.
      // 1) Filter out shorts / ultra-short content.
      const durationMin = v.duration_min ?? null;
      const tooShort = typeof durationMin === 'number' && Number.isFinite(durationMin) && durationMin < MIN_DURATION_MINUTES;

      // 2) Filter obvious non-learning formats.
      const importIntent = v.import_intent ?? extractImportIntent(v.notes);
      const nonLearning = isLikelyNonLearning(v.title, v.description);

      const gamingIntent = isGamingIntent(importIntent);

      // 3) Canonicalize topic name against known canonical topics (canonical_topics).
      const canon = await canonicalizeTopicName(r.topic_name, topicCache);
      const topic_name = canon.name;
      const topicKnown = canon.known;

      // Allow publishing a *new* topic when confidence clears a higher bar than the base threshold.
      // Default is intentionally not extreme, because canonical_topics may lag behind newly imported topics.
      const allowNewTopic = r.confidence >= Math.max(threshold, NEW_TOPIC_CONFIDENCE_OVERRIDE);

      // Publish gate:
      // - Do NOT block on "unknown topic"; canonical_topics may be incomplete and coverage is an output.
      // - Non-learning heuristic is a soft gate except for clearly gaming-format noise on non-gaming intents.
      const okToPublish =
        r.confidence >= threshold &&
        r.level !== 'Unknown' &&
        !tooShort &&
        // If it looks like non-learning content and the intent is NOT gaming-related, require very high confidence.
        !(nonLearning && !gamingIntent && r.confidence < Math.min(0.99, threshold + 0.20)) &&
        // Known canonical topics use the base threshold; brand-new topics need the higher override.
        (topicKnown || allowNewTopic);

      // If we canonicalized, carry it forward.
      r.topic_name = topic_name;

      // Add lightweight diagnostics.
      const diagParts: string[] = [];
      if (tooShort) diagParts.push(`too_short(<${MIN_DURATION_MINUTES}m)`);
      if (nonLearning) diagParts.push('non_learning_hint');
      if (!topicKnown) diagParts.push(allowNewTopic ? 'new_topic_allowed' : 'topic_unlisted_requires_high_confidence');
      if (nonLearning && !gamingIntent) diagParts.push('non_learning_gate');
      if (gamingIntent) diagParts.push('gaming_intent');

      const diag = diagParts.length ? diagParts.join(';') : null;

      const { error: updErr } = await supabaseServer
        .from('videos')
        .update({
          topic_name: r.topic_name,
          subtopic_name: r.subtopic_name,
          level: r.level,
          difficulty_score_1to5: r.difficulty_score_1to5,
          tags_text: r.tags.join(','),
          prerequisites_text: r.prerequisites_text,
          confidence: r.confidence,
          notes: diag ? `${r.notes ?? ''}${r.notes ? ' | ' : ''}${diag}`.trim() : r.notes,
          status: okToPublish ? 'published' : 'rejected',
          is_active: okToPublish,
        })
        .eq('id', v.id);
      if (updErr) throw new Error(`db_update_failed:${updErr.message}`);

      if (okToPublish) published++;
      else rejected++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const { error: updErr } = await supabaseServer
        .from('videos')
        .update({ status: 'failed', is_active: false, notes: `classify_failed:${msg}` })
        .eq('id', v.id);
      if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
      failed++;
    }
  }

  return { processed: videos.length, published, rejected, failed };
}