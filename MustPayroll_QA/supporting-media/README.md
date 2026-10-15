# Optional supporting media

Screenshots, Playwright videos and traces are supplementary debugging or presentation material. Neither supplied source requires screenshots as a separate submission deliverable. The original Quest does require a defect report containing evidence and accessible verification evidence in directive.md, as well as the candidate's final Loom of no more than five minutes.

The default verification retains reports, console logs, build identities and observed state, without requiring screenshots or browser videos. To collect extra media, set QA_CAPTURE_MEDIA=1 before npm run verify; it is saved under each execution's supporting-media folder. Automation videos do not replace the candidate's Loom.

previous-run contains preserved media from the earlier directory layout. Each folder includes its original-run.json, identifying the actual old build and timestamp. These files are historical supporting material, not evidence of the latest reorganized build execution.
