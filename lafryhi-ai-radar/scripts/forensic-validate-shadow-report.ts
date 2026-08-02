import { forensicValidateReport } from "../src/services/evaluation/forensic-validator";

const reportPath = process.argv[2];
if (!reportPath) throw new Error("Usage: npm run eval:shadow:forensic-validate -- <report-path>");
forensicValidateReport(reportPath)
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
