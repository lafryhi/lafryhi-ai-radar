import type { DevelopmentQualificationFixtureSetInput } from "../../domain/phase5/source-intelligence/qualification";

const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const generatedAt = "2026-07-27T12:00:00.000Z";

function artifactId(sequence: number): string {
  return `p5-artifact:v1:fixture:${sequence.toString(16).padStart(64, "0")}`;
}

function provenance(sequence: number) {
  return {
    contractVersion: "phase5-provenance-v1" as const,
    sourceDefinitionId: `source-definition-${sequence}`,
    sourceRecordId: `source-record-${sequence}`,
    processingRunId: `processing-run-${sequence}`,
    parentArtifactIds: [] as string[],
    transformation: { identifier: "phase5.development-fixture", version: "v1" },
    contentDigest: { algorithm: "sha256" as const, digest: sequence % 2 === 0 ? digestA : digestB },
    generatedAt,
    producerIdentity: "phase5-fixture-author",
    derivationReason: "test_fixture" as const,
    correctionLineage: [] as Array<{ artifactId: string; reasonCode: string }>,
    supersessionLineage: [] as Array<{ artifactId: string; reasonCode: string }>,
  };
}

function source(sequence: number, title: string, body: string, languageHint: "en" | "fr" | "ar" | "mixed" | "unknown" = "en") {
  return {
    artifactId: artifactId(sequence),
    generatedAt,
    provenance: provenance(sequence),
    title,
    body,
    languageHint,
  };
}

export const developmentQualificationFixtures: DevelopmentQualificationFixtureSetInput = {
  version: "p5-development-fixtures-v1",
  urls: [
    { fixtureId: "p5-dev:url:identical", input: "https://example.test/story", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story" } },
    { fixtureId: "p5-dev:url:tracking", input: "https://EXAMPLE.test/story?utm_source=x&id=7", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story?id=7" } },
    { fixtureId: "p5-dev:url:fragment", input: "https://example.test/story#section", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story" } },
    { fixtureId: "p5-dev:url:http-port", input: "http://example.test:80/story", expected: { status: "NORMALIZED", normalizedUrl: "http://example.test/story" } },
    { fixtureId: "p5-dev:url:https-port", input: "https://example.test:443/story", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story" } },
    { fixtureId: "p5-dev:url:nondefault-port", input: "https://example.test:8443/story", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test:8443/story" } },
    { fixtureId: "p5-dev:url:meaningful-query", input: "https://example.test/story?source=wire&campaign=local&ref=home", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story?campaign=local&ref=home&source=wire" } },
    { fixtureId: "p5-dev:url:duplicate-query", input: "https://example.test/story?id=2&id=1&a=first", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story?a=first&id=2&id=1" } },
    { fixtureId: "p5-dev:url:empty-path", input: "https://example.test", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/" } },
    { fixtureId: "p5-dev:url:dot-segments", input: "https://example.test/a/../b/./story", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/b/story" } },
    { fixtureId: "p5-dev:url:trailing-slash", input: "https://example.test/story/", expected: { status: "NORMALIZED", normalizedUrl: "https://example.test/story/" } },
    { fixtureId: "p5-dev:url:unicode-host", input: "https://münchen.example/café", expected: { status: "NORMALIZED", normalizedUrl: "https://xn--mnchen-3ya.example/caf%C3%A9" } },
    { fixtureId: "p5-dev:url:malformed", input: "not a url", expected: { status: "REJECTED" } },
    { fixtureId: "p5-dev:url:javascript", input: "javascript:alert(1)", expected: { status: "REJECTED" } },
    { fixtureId: "p5-dev:url:data", input: "data:text/plain,hello", expected: { status: "REJECTED" } },
    { fixtureId: "p5-dev:url:file", input: "file:///tmp/story", expected: { status: "REJECTED" } },
    { fixtureId: "p5-dev:url:credentials", input: "https://user:password@example.test/story", expected: { status: "REJECTED" } },
    { fixtureId: "p5-dev:url:control", input: "https://example.test/\u0000story", expected: { status: "REJECTED" } },
  ],
  sources: [
    { fixtureId: "p5-dev:source:english", input: source(101, "Daily Update", "A synthetic report.\r\nSecond line."), expectedStatus: "NORMALIZED", expectedTitle: "Daily Update", expectedBody: "A synthetic report.\nSecond line." },
    { fixtureId: "p5-dev:source:french-accent", input: source(102, "Économie", "L’économie évolue.", "fr"), expectedStatus: "NORMALIZED", expectedTitle: "Économie", expectedBody: "L’économie évolue." },
    { fixtureId: "p5-dev:source:french-apostrophe", input: source(103, "L'actualité", "L’actualité reste synthétique.", "fr"), expectedStatus: "NORMALIZED", expectedBody: "L’actualité reste synthétique." },
    { fixtureId: "p5-dev:source:arabic", input: source(104, "تقرير", "هذا نص عربي تجريبي.", "ar"), expectedStatus: "NORMALIZED", expectedBody: "هذا نص عربي تجريبي." },
    { fixtureId: "p5-dev:source:arabic-diacritic", input: source(105, "تَقْرِير", "هٰذَا نَصٌّ.", "ar"), expectedStatus: "NORMALIZED", expectedTitle: "تَقْرِير" },
    { fixtureId: "p5-dev:source:arabic-tatweel", input: source(106, "تقــرير", "نــص تجريبي.", "ar"), expectedStatus: "NORMALIZED", expectedTitle: "تقــرير" },
    { fixtureId: "p5-dev:source:mixed", input: source(107, "Radar رادار", "Texte français ونص عربي.", "mixed"), expectedStatus: "NORMALIZED" },
    { fixtureId: "p5-dev:source:nfc", input: source(108, "Cafe\u0301", "Re\u0301sume\u0301"), expectedStatus: "NORMALIZED", expectedTitle: "Café", expectedBody: "Résumé" },
    { fixtureId: "p5-dev:source:whitespace", input: source(109, "  Spaced   title  ", " First\tline \n\n\n Second  line "), expectedStatus: "NORMALIZED", expectedTitle: "Spaced title", expectedBody: "First line\n\nSecond line" },
    { fixtureId: "p5-dev:source:control", input: source(110, "Safe\u0007 title", "Body\u0000 text"), expectedStatus: "NORMALIZED", expectedTitle: "Safe title", expectedBody: "Body text" },
    { fixtureId: "p5-dev:source:empty", input: source(111, "", ""), expectedStatus: "INSUFFICIENT_CONTENT", expectedTitle: "", expectedBody: "" },
    { fixtureId: "p5-dev:source:title-only", input: source(112, "Synthetic title", ""), expectedStatus: "NORMALIZED", expectedBody: "" },
  ],
  duplicates: [
    { fixtureId: "p5-dev:duplicate:exact-document", left: source(201, "Title", "Same body."), right: source(202, "Title", "Same body."), leftUrl: "https://a.test/story", rightUrl: "https://a.test/story", expected: "EXACT_DOCUMENT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:tracking-variant", left: source(203, "Title", "Same body."), right: source(204, "Title", "Same body."), leftUrl: "https://a.test/story?utm_source=x", rightUrl: "https://a.test/story", expected: "EXACT_DOCUMENT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:whitespace-variant", left: source(205, "Title", "Same   body."), right: source(206, "Title", "Same body."), expected: "EXACT_DOCUMENT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:nfc-variant", left: source(207, "Cafe\u0301", "Re\u0301sume\u0301"), right: source(208, "Café", "Résumé"), expected: "EXACT_DOCUMENT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:different-case", left: source(209, "Title", "Case matters."), right: source(210, "title", "case matters."), expected: "NOT_EXACT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:same-url-different-body", left: source(211, "Update", "First version."), right: source(212, "Update", "Second version."), leftUrl: "https://a.test/update", rightUrl: "https://a.test/update", expected: "NOT_EXACT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:different-url-same-body", left: source(213, "Wire", "Identical body."), right: source(214, "Wire", "Identical body."), leftUrl: "https://a.test/wire", rightUrl: "https://b.test/wire", expected: "EXACT_BODY_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:same-publisher-distinct", left: source(215, "Daily Brief", "Topic alpha."), right: source(216, "Daily Brief", "Topic beta."), expected: "NOT_EXACT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:same-event-different-publisher", left: source(217, "City vote", "Council approved plan A."), right: source(218, "City vote", "Opposition discussed plan B."), expected: "NOT_EXACT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:false-merge-trap", left: source(219, "Market update", "Company A rose."), right: source(220, "Market update", "Company B fell."), expected: "NOT_EXACT_DUPLICATE" },
    { fixtureId: "p5-dev:duplicate:false-split-trap", left: source(221, "Résumé", "Line one.\r\nLine two."), right: source(222, "Re\u0301sume\u0301", "Line one.\nLine two."), expected: "EXACT_DOCUMENT_DUPLICATE" },
  ],
};
