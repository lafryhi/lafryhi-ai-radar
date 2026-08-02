import { detectForbiddenTermsInFields } from "../src/domain/forbidden-term-detector";
import { EDITORIAL_POLICY_CONSTITUTION } from "../src/services/editorial-policy-engine";

const fixtures = [
  ["exact", "all firms"],
  ["uppercase", "ALL FIRMS"],
  ["punctuation", "all—firms"],
  ["whitespace", "all   firms"],
  ["french", "Ce résultat est garanti."],
  ["mixed", "English, français garanti, العربية، all firms."],
  ["longer-word", "small firms and warranties"],
  ["absent", "some organizations"],
] as const;

const results = fixtures.map(([id, text]) => ({
  id,
  ...detectForbiddenTermsInFields(
    { fixtureText: text },
    EDITORIAL_POLICY_CONSTITUTION.forbiddenTerms,
    EDITORIAL_POLICY_CONSTITUTION.forbiddenTermSettings,
  ),
}));
console.log(JSON.stringify({ modelCalls: 0, infrastructureWrites: 0, results }, null, 2));
