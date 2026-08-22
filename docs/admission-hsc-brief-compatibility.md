# HSC and Admission Brief Compatibility Record

## Purpose

This record reconciles the attached admission and HSC brief with the production MCQ GURU platform. It keeps the secure, server-authoritative assessment model and distinguishes a preparation label from an evidence-backed claim about an official examination or a historical question paper.

## Implemented student entry points

| Requested entry point | MCQ GURU route | Delivered behavior |
| --- | --- | --- |
| Admission preparation | `/admission-prep` → `/admission` | Opens the existing track-organized admission practice workflow. It exposes only reviewed original source-linked DU, BUET, and Medical preparation capacity and does not relabel general HSC questions as institution-specific practice. |
| HSC preparation | `/hsc-prep` → `/exams` | Opens the existing HSC custom exam preparation workflow, including live published subject/chapter capacity, content-language selection, readiness summary, and a frozen server-selected attempt handoff. |
| Previous-year questions | `/previous-year-questions` → `/historical-analysis` | Opens the existing verified historical-analysis browser. It can show authorised aggregate pattern metrics, source/version/page references, and reviewer-approved notes when available. |

These aliases use explicit route registration and protected student routes. They do not introduce a catch-all redirect or weaken direct-link access control.

## Requirement reconciliation

| Brief request | Current compatible implementation | Boundary retained |
| --- | --- | --- |
| HSC subject, chapter, and exam setup | Existing `/exams` uses active source-linked published capacity and sends a bounded preset to the immutable attempt engine. | The client does not choose questions or submit answer keys. |
| University and medical unit tracks | Existing `/admission` supports DU unit labels, BUET, MBBS, CKRUET, and GST labels, with only DU, BUET, and Medical enabled when source-tagged reviewed capacity exists. | A label without reviewed capacity is unavailable; it never falls back to general HSC questions. |
| Pattern, date, marking, cut-off, and eligibility information | Existing pattern and notice registries can display a fact only after a reviewer activates a complete versioned official-source record. | Draft or incomplete patterns remain unavailable. No rule or date is inferred from the brief. |
| Previous-year question bank | Existing historical-analysis import/review workflow supports authorised aggregate analytics with versioned source and page/section evidence. | No protected past-paper text, answer choices, or claimed historical questions are copied from unlicensed sources or generated from the brief. |
| Real practice question capacity | Existing reviewer-governed workflow releases original source-linked questions after academic-chain, source, answer, explanation, and reviewer checks. | “Original source-linked practice” is not represented as an official past question. |

## Data status at the time of reconciliation

The current official HSC, Medical, BUET, and DU pattern records remain draft or under review when their official session, date, question total, duration, marking, negative-mark, and eligibility fields are incomplete. MCQ GURU therefore continues to show an honest unavailable state rather than publishing a guessed pattern or eligibility result.

The current student historical-analysis browser also remains intentionally empty until an administrator imports records from an authorised source version and a reviewer marks both the import batch and individual metrics as verified. This is a data-availability state, not a request to create synthetic historic records.

## Content and security decisions

The brief includes examples and requests for extensive “real previous-year questions.” Those examples are not sufficient provenance or reuse authorization, and the platform will not copy, scrape, fabricate, or label such material as historical. New practice content must either be independently authored and source-linked to approved curriculum/pattern context, or originate from an authorised source with documented version and page/section evidence followed by human review.

The existing attempt engine remains authoritative: server-side selection is frozen before delivery, correct answers remain outside active client question APIs, scoring runs on the server, and only an attempt owner can resume or review that attempt.

## Validation record

The route registry regression test now asserts the three compatibility mappings. Type checking, the complete regression suite, Drizzle migration integrity checking, and the production build completed successfully after the change. Direct desktop and mobile route checks confirmed that each requested path opens its established destination without a 404: admission preparation, HSC custom exam preparation, and the verified historical-analysis browser. The historical browser correctly displayed its empty state because no verified historical-analysis records are currently available.
