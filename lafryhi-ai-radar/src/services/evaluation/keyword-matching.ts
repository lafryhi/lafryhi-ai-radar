function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function normalizedKeywordMatch(text: string, keyword: string) {
  const haystack = ` ${normalize(text)} `;
  const needle = normalize(keyword);
  return Boolean(needle && haystack.includes(` ${needle} `));
}

export function requiredKeywordDiagnostics(
  output: string,
  required: string[],
  alternativeGroups: string[][],
) {
  const missingRequired = required.filter((keyword) => !normalizedKeywordMatch(output, keyword));
  const missingAlternatives = alternativeGroups.filter((group) => !group.some((keyword) => normalizedKeywordMatch(output, keyword)));
  return {
    valid: missingRequired.length === 0 && missingAlternatives.length === 0,
    missing: [...missingRequired, ...missingAlternatives.map((group) => group.join(" | "))],
  };
}
