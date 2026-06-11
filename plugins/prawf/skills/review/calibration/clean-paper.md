# Association Between Structured Note-Taking and Final-Exam Performance in Undergraduate Statistics Courses

**Authors**: J. Han (Department of Psychology, Verdant State University) · M. Okafor (School of Education, Northvale
College)
**Preregistration**: OSF Registries `osf.io/2kq9z`, registered 2025-09-02 — before data collection began (2025-10-06)
**Data, code & materials**: `osf.io/8xw3v` (de-identified data, analysis scripts, survey instrument)

## Abstract

Structured note-taking is widely recommended to undergraduates, yet its relation to course performance is rarely
estimated with preregistered, adequately powered designs. In this preregistered cross-sectional study, 481
undergraduates across three institutions completed the 12-item Note-Taking Structure Inventory (NTSI); final-exam
scores were obtained from institutional records with consent. NTSI scores were positively associated with final-exam
performance after adjustment for prior GPA, weekly study hours, and course section (β = .19, 95% CI [.10, .28],
p < .001). Of two preregistered secondary hypotheses, the association with homework completion survived Holm
correction; we found no evidence that class year moderated the primary association. Because the design is
cross-sectional, these estimates describe associations only; randomized evaluation of note-taking instruction is the
appropriate next step.

## 1. Introduction

Note-taking strategy is one of the few study behaviors instructors can directly observe and coach (Reyes & Lindqvist,
2021). Correlational reports link structured strategies — hierarchical outlines, cue columns, post-lecture summaries —
to better course outcomes, but most rely on small convenience samples and flexible analyses (Duval, 2019). Following
the estimation-focused recommendations of Okonkwo, Reyes, and Brandt (2023), we preregistered our hypotheses, sample
size, exclusion criteria, and full analysis plan before data collection.

**H1 (primary)**: NTSI total score is positively associated with final-exam score, adjusting for prior GPA, weekly
study hours, and course section.
**H2 (secondary)**: NTSI total score is positively associated with homework completion rate, with the same adjustments.
**H3 (secondary)**: the H1 association is moderated by class year.

## 2. Method

### 2.1 Preregistration and transparency

Hypotheses, target sample size, exclusion criteria, measures, and the analysis plan were registered at OSF
(`osf.io/2kq9z`) on 2025-09-02, before data collection began on 2025-10-06. There were no deviations from the
registered plan. All measures, conditions, and exclusions are reported.

### 2.2 Participants

An a priori power analysis specified the smallest association of interest as r = .15; detecting it at α = .05
(two-tailed) with .90 power requires N = 463. We recruited 510 students enrolled in introductory statistics at three
institutions to buffer exclusions. Per the preregistered criteria, 22 participants who completed less than 80% of the
survey and 7 who did not consent to registrar linkage were excluded, leaving N = 481 (58% women; median age 20).
Participants received course credit. The study was approved by the Verdant State IRB (#2025-184).

### 2.3 Measures

**Note-taking structure.** The NTSI (12 items, 5-point Likert scale; e.g., "I reorganize my notes into an outline
after class") showed good internal consistency in this sample (McDonald's ω = .88). **Final-exam score.** Percentage
score on the department-standardized final examination, obtained from institutional records with consent.
**Covariates.** Prior-semester GPA (registrar records), self-reported weekly study hours, and course section
(dummy-coded).

### 2.4 Procedure

The survey was administered online during week 13 of the semester; exam scores and GPA were linked through the
registrar after final grades were posted. All analyses used R 4.4; scripts are available in the repository above.

### 2.5 Missing data

Item-level missingness was low (1.8% of NTSI responses; 2.4% of study-hours reports). Per the preregistered plan,
missing items were handled with multiple imputation by chained equations (m = 20), pooling estimates with Rubin's
rules. A complete-case sensitivity analysis yielded substantively identical results (Supplement S2).

## 3. Results

**Primary (H1).** In the preregistered linear model, NTSI score was positively associated with final-exam score after
adjustment for prior GPA, weekly study hours, and course section: β = .19, 95% CI [.10, .28], p < .001, ΔR² = .031.
H1 was the single preregistered primary test, so no multiplicity correction applied to it. Model assumptions
(linearity, homoscedasticity, residual normality) were checked and met (Supplement S3).

**Secondary (H2–H3).** The two secondary tests were Holm-corrected as preregistered. NTSI score was associated with
homework completion rate (β = .14, 95% CI [.05, .23], Holm-adjusted p = .012). The class-year moderation term was not
significant (β = .04, 95% CI [−.05, .13], Holm-adjusted p = .62); we found no evidence for H3 and treat the
moderation question as open.

## 4. Discussion

In a preregistered, adequately powered sample, structured note-taking was modestly but reliably associated with
final-exam performance over and above prior GPA and study time. The estimate (β = .19) is consistent with, but does
not establish, a benefit of structured strategies.

**Limitations.** First, the design is cross-sectional: reverse causality (stronger students may adopt structured
strategies) and residual confounding (e.g., conscientiousness) remain plausible, so no causal claim is made. Second,
the NTSI is self-reported; behavioral logging would strengthen measurement. Third, the sample is drawn from three
institutions in one country, which bounds generalization. A preregistered randomized evaluation of note-taking
instruction is the natural next step.

## Data, Code, and Materials Availability

De-identified data, analysis scripts, and the survey instrument are available at `osf.io/8xw3v`. The preregistration
is at `osf.io/2kq9z`.

## Conflict of Interest and Funding

The authors declare no conflicts of interest. The study was supported by a Verdant State internal teaching grant
(TG-2025-31); the funder had no role in design, analysis, or reporting.

## References

- Duval, P. (2019). Study strategies and course outcomes: A narrative review. *Journal of Learning Research, 14*(2), 101–118.
- Okonkwo, A., Reyes, S., & Brandt, L. (2023). Estimation over significance in education research. *Educational Methods, 8*(1), 33–49.
- Reyes, S., & Lindqvist, E. (2021). Observable study behaviors as coaching targets. *Teaching of Statistics, 29*(4), 210–224.
