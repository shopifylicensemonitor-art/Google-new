/**
 * High-performance, robust spintax parser.
 * Supports:
 * - Word spintax: {Hello|Hi|Hey}
 * - Sentence spintax: {I noticed your store and loved the branding.|Saw your work online and wanted to connect.}
 * - Multi-line and multi-paragraph spintax blocks
 * - Nested spintax: {Good {morning|day}|Hello}, {hope all is well|how are you doing?}
 * - Embedded variables within spintax: {Hi {{first_name}}, reaching out about {{company}}.|Hello {{first_name}}, loved what you built at {{company}}.}
 */
function parseSpintax(text, randomFn = Math.random) {
  if (!text || typeof text !== 'string') return text || '';

  // 1. Shield variable placeholders so their curly braces do not interfere with spintax matching
  const shieldedVars = [];
  let workingText = text;

  // Shield {{double_curly_vars}}
  workingText = workingText.replace(/\{\{[^{}]+\}\}/g, (match) => {
    const placeholder = `__SPINTAX_VAR_D_${shieldedVars.length}__`;
    shieldedVars.push({ placeholder, original: match });
    return placeholder;
  });

  // Shield single {variable_names} that do not contain a pipe
  workingText = workingText.replace(/\{([a-zA-Z0-9_\-\s]+)\}/g, (match) => {
    const placeholder = `__SPINTAX_VAR_S_${shieldedVars.length}__`;
    shieldedVars.push({ placeholder, original: match });
    return placeholder;
  });

  // 2. Recursively resolve innermost spintax blocks {option1|option2|...}
  // The 's' flag ensures matching across newlines and multi-sentence blocks.
  const spintaxRegex = /\{([^{}]*\|[^{}]*)\}/s;
  let match;
  let iterations = 0;
  const MAX_ITERATIONS = 200;

  while ((match = workingText.match(spintaxRegex)) && iterations < MAX_ITERATIONS) {
    iterations++;
    const innerContent = match[1];
    const options = innerContent.split('|');
    const chosenIndex = Math.floor(randomFn() * options.length);
    const chosen = options[chosenIndex] !== undefined ? options[chosenIndex] : options[0];

    workingText =
      workingText.substring(0, match.index) +
      chosen +
      workingText.substring(match.index + match[0].length);
  }

  // 3. Unshield variable placeholders
  for (let i = shieldedVars.length - 1; i >= 0; i--) {
    const item = shieldedVars[i];
    workingText = workingText.replaceAll(item.placeholder, item.original);
  }

  return workingText;
}

module.exports = { parseSpintax };
