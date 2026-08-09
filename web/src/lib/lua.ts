// ============================================================
// Lua script validation + shared script-copy helpers
// ============================================================

/**
 * Warning line that is prepended (as a harmless Lua comment) when an
 * UNVERIFIED script is copied. Because it starts with `--` it never changes
 * how the script runs — it is only a visual note for the person pasting it.
 */
export const UNTESTED_SCRIPT_PREFIX =
  '-- ــ[اسکریپت تست نشده است با ریسک خود ران کنید]ــ';

/**
 * Returns the text that should be placed on the clipboard for a script.
 * Unverified scripts get the visual warning comment on the very first line.
 */
export const buildClipboardScript = (scriptContent: string, isVerified: boolean): string =>
  isVerified ? scriptContent : `${UNTESTED_SCRIPT_PREFIX}\n${scriptContent}`;

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------

/**
 * Removes Lua comments (-- line comments and --[[ long comments ]] with any
 * level) and string literals ("..." '...' and [[ ... ]]) so language-keyword
 * detection is not confused by text inside strings. JavaScript template
 * literals (backticks) are intentionally NOT stripped — a backtick can never
 * appear in valid Lua, so leaving it lets the backtick hard-fail fire.
 */
const stripLuaCommentsAndStrings = (src: string): string => {
  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    // Comments
    if (src[i] === '-' && src[i + 1] === '-') {
      const longMatch = /^--\[=*\[/.exec(src.slice(i, i + 12));
      if (longMatch) {
        const closer = ']' + longMatch[0].slice(3, -1) + ']';
        const endIdx = src.indexOf(closer, i + longMatch[0].length);
        i = endIdx === -1 ? n : endIdx + closer.length;
        continue;
      }
      const newlineIdx = src.indexOf('\n', i);
      i = newlineIdx === -1 ? n : newlineIdx;
      continue;
    }

    // Long bracket strings [[ ]] / [==[ ]==] etc.
    const longStr = /^\[=*\[/.exec(src.slice(i, i + 8));
    if (longStr) {
      const closer = ']' + longStr[0].slice(1, -1) + ']';
      const endIdx = src.indexOf(closer, i + longStr[0].length);
      i = endIdx === -1 ? n : endIdx + closer.length;
      out += ' ';
      continue;
    }

    // Quoted strings
    if (src[i] === '"' || src[i] === "'") {
      const quote = src[i];
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      out += ' ';
      continue;
    }

    out += src[i];
    i++;
  }

  return out;
};

const countMatches = (text: string, regex: RegExp): number => {
  regex.lastIndex = 0;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};

/**
 * Keyword matcher WITHOUT regex lookbehind — lookbehind (?<!…) is a syntax
 * error on Safari < 16.4 / older iOS and would break the whole bundle at
 * parse time (blank page). Equivalent boundary using a consumed prefix char;
 * safe because two keywords can never be directly adjacent in real code.
 */
const kw = (word: string): RegExp => new RegExp('(?:^|[^.%:\\w])' + word + '\\b', 'g');

// ------------------------------------------------------------
// Language detection
// ------------------------------------------------------------

/**
 * Patterns that can NEVER appear in valid Lua source — a single match means
 * the code is definitively written in another language. Checked against the
 * comment/string-stripped code so innocent string contents do not trigger.
 */
const HARD_FAIL_PATTERNS: RegExp[] = [
  // JS / TS
  /`/, // template literals / backticks are not Lua
  /=>/, // arrow functions
  /\b(?:const|let|var)\s+[A-Za-z_$][$\w]*\s*(?:=|;|,|\[|\.|:)/, // JS declarations
  /\bfunction\b[^()]{0,80}\([^)]*\)\s*\{/, // JS function bodies with braces
  /\)\s*=>\s*/, // arrow after parenthesis
  /\bconsole\.(?:log|error|warn|info|debug)\s*\(/,
  /\bdocument\.(?:getElementById|querySelector|querySelectorAll|createElement|addEventListener)/,
  /\bwindow\.(?:location|alert|open|localStorage|sessionStorage)/,
  /\bnew\s+[A-Z]\w*\s*\(/, // JS/Java style "new Class("
  /\b(?:if|while|for)\s*\([^)]*\)\s*\{/, // C-style if/while/for with braces

  // Python
  /\bdef\s+\w+\s*\([^)]*\)\s*:/,
  /\belif\b[^:\n]{0,120}:/,
  /^\s*(?:import|from)\s+[A-Za-z_]\w*(?:\.|\s|$)/m, // python/JS import statements
  /\bprint\s+[^\s("'`=]/, // python2-style bare print (never valid Lua)
  /\braise\s+\w+/,

  // C / C++ / C# / Java
  /#\s*(?:include|pragma|define|ifdef|ifndef|endif|undef)\b/,
  /\busing\s+namespace\b|\busing\s+System\b/,
  /\bstd::|\bcout\s*<<|\bprintf\s*\(/,
  /\bSystem\.out\.print|\bpublic\s+static\s+void\s+main\b/,
  /\b(?:public|private|protected)\s+(?:static\s+)?(?:class|void|int|string|bool|float|double|long)\b/,
  /\bclass\s+[A-Z]\w*\s*[:{\n]/, // OOP class declarations

  // Go / Rust / Swift / Kotlin
  /\bfunc\s+\w+\s*\([^)]*\)\s*\{/,
  /\bpackage\s+main\b|\bfmt\.Print/,
  /\bfn\s+\w+\s*\([^)]*\)\s*(?:\{|->)/,
  /\blet\s+mut\s+\w+/,

  // PHP
  /<\?php/i,
  /\$[A-Za-z_]\w*\s*=[^=]/, // $variables

  // HTML / XML (definitive only: a closing tag `</` is a syntax ERROR in Lua,
  // so no valid Lua can ever contain one — see notes below)
  /<\//,
  /<!doctype|<\?xml/i,

  // SQL
  /\bSELECT\s+[\w*`][\s\S]{0,400}?\sFROM\b/i,
  /\bINSERT\s+INTO\b|\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b|\bDROP\s+TABLE\b/i,

  // Shell commands
  /^\s*(?:npm|npx|pip|pip3|apt|apt-get|sudo|curl|wget|chmod|cd)\s+\S/m,
  /^#!\//m,
];

/**
 * HTML tag opener — NOT a single-match hard fail, because Lua comparisons
 * like `x <input` (variable named "input") are valid code. Real pasted HTML
 * always contains several tags, so we require 2+ hits.
 */
const HTML_TAG_PATTERN =
  /<(?:script|div|span|body|html|head|style|iframe|button|form|table|img|section|article|main|footer|nav|h[1-6])(?:\s|>|\/)/gi;

/**
 * JSON-style "key": value — requires 3+ hits because Lua scripts legitimately
 * embed small JSON blobs inside long strings (e.g. HttpPost bodies), which a
 * single match could false-flag.
 */
const JSON_KEY_PATTERN = /"[^"\n]{1,60}"\s*:\s*[{\["\dtruefalsn]/gi;

/** Lua signal rules: [regex, points, maxPoints] — capped per rule to avoid spam. */
const LUA_SIGNALS: Array<{ regex: RegExp; points: number; cap: number }> = [
  // Roblox / executor ecosystem (very strong)
  { regex: /\bloadstring\s*\(/g, points: 3, cap: 3 },
  { regex: /\bgame\s*[:.]\s*\w+/g, points: 3, cap: 3 },
  { regex: /\bworkspace\b/g, points: 2, cap: 2 },
  { regex: /\bscript\.Parent\b/g, points: 2, cap: 2 },
  {
    regex:
      /\b(?:getgenv|gethui|getsenv|getrenv|hookfunction|hookmetamethod|getrawmetatable|setreadonly|fireclickdetector|firetouchinterest|fireproximityprompt|queue_on_teleport|setclipboard|toclipboard|identifyexecutor|getexecutorname|is_sirhurt_closure|checkcaller)\b/g,
    points: 2,
    cap: 2,
  },
  { regex: /\bInstance\.new\b/g, points: 2, cap: 2 },
  { regex: /\btask\s*\.\s*(?:spawn|wait|delay|defer|cancel|synchronize|desynchronize)\b/g, points: 1, cap: 2 },
  { regex: /\b_G\s*[.=[\w]/g, points: 1, cap: 1 },
  { regex: /\bshared\s*[.=[\w]/g, points: 1, cap: 1 },

  // Core Lua keywords (each keyword type counts a capped amount)
  { regex: kw('local'), points: 1, cap: 3 },
  { regex: kw('function'), points: 1, cap: 3 },
  { regex: kw('(?:then|do|repeat|until|elseif|end)'), points: 1, cap: 3 },
  { regex: kw('(?:if|else|for|while|return|break|in)'), points: 1, cap: 3 },
  { regex: kw('(?:nil|true|false|and|or|not)'), points: 1, cap: 2 },

  // Stdlib / common calls
  {
    regex: kw(
      '(?:pcall|xpcall|ipairs|pairs|next|tostring|tonumber|setmetatable|getmetatable|rawget|rawset|rawequal|require|select|unpack|coroutine)(?=\\s*[.("\'\\s])'
    ),
    points: 1,
    cap: 3,
  },
  { regex: /\b(?:string|table|math|os|io|bit32|utf8|vector|Color3|Vector3|Vector2|CFrame|UDim2|Enum)\s*[.(]/g, points: 1, cap: 3 },
  { regex: kw('(?:print|warn|error|assert|type|typeof)(?=\\s*\\()'), points: 2, cap: 2 },
  { regex: /\bwait\s*\(/g, points: 1, cap: 1 },

  // Syntax idioms
  { regex: /:\w+\s*\(/g, points: 1, cap: 2 }, // colon method calls
  { regex: /\.\./g, points: 1, cap: 1 }, // string concatenation
  { regex: /~=/g, points: 1, cap: 1 }, // Lua "not equal"
];

/**
 * Validates that the given source looks like Lua (the only language the site
 * accepts). Returns { ok, reason } where reason is a short English key for
 * internal logging/heuristics (the UI shows a fixed Persian message).
 */
export const validateLuaScript = (
  rawCode: string
): { ok: boolean; reason: 'ok' | 'empty' | 'foreign_language' | 'unbalanced' | 'no_lua_signals'; score?: number } => {
  const code = (rawCode || '').trim();
  if (!code) return { ok: false, reason: 'empty' };

  const stripped = stripLuaCommentsAndStrings(code);

  // 1) Definitive "this is NOT Lua" patterns (on stripped code)
  for (const regex of HARD_FAIL_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(stripped)) {
      return { ok: false, reason: 'foreign_language' };
    }
  }

  // 1b) Counter-based heuristics (need several independent hits to avoid
  //     false-flagging valid Lua that merely mentions these shapes)
  if (countMatches(code, HTML_TAG_PATTERN) >= 2) {
    return { ok: false, reason: 'foreign_language' };
  }
  if (countMatches(code, JSON_KEY_PATTERN) >= 3) {
    return { ok: false, reason: 'foreign_language' };
  }

  // 2) Structural balance: block openers vs closers.
  //    (function|then|do|repeat)  ==  (end|until|elseif)
  //    `elseif` brings its own `then` but no extra `end`, so it counts as a closer.
  const opens =
    countMatches(stripped, kw('function')) +
    countMatches(stripped, kw('then')) +
    countMatches(stripped, kw('do')) +
    countMatches(stripped, kw('repeat'));
  const closes =
    countMatches(stripped, kw('end')) +
    countMatches(stripped, kw('until')) +
    countMatches(stripped, kw('elseif'));

  let structureBonus = 0;
  if (opens > 0 || closes > 0) {
    if (opens === closes) {
      structureBonus = 2;
    } else {
      // Broken structure → this Lua would not even run.
      return { ok: false, reason: 'unbalanced' };
    }
  }

  // 3) Positive Lua signal scoring
  let score = structureBonus;
  for (const { regex, points, cap } of LUA_SIGNALS) {
    const hits = countMatches(stripped, regex);
    if (hits > 0) score += Math.min(hits * points, cap);
  }
  if (/--[^\n]*/.test(code)) score += 1; // has Lua comments (checked on original)

  if (score >= 2) return { ok: true, reason: 'ok', score };
  return { ok: false, reason: 'no_lua_signals', score };
};
