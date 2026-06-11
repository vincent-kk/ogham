# Structured Note-Taking Improves Final-Exam Performance in Undergraduate Statistics Courses

**Authors**: J. Han (Department of Psychology, Verdant State University) · M. Okafor (School of Education, Northvale
College)
**Preregistration**: OSF Registries `osf.io/2kq9z`, registered 2025-09-02 (primary outcome: overall final-exam score;
planned sample N = 463)
**Data, code & materials**: `osf.io/8xw3v` (de-identified data, analysis scripts, survey instrument)

## Abstract

Structured note-taking is widely recommended to undergraduates, and this study demonstrates why. Among 38 students in
an introductory statistics course, structured note-taking produced large, robust gains in exam performance. Scores on
the 12-item Note-Taking Structure Inventory (NTSI) strongly predicted conceptual-subscale exam performance among
third-year students (r = .55, p = .041), a large effect. These results show that adopting structured note-taking
improves exam outcomes, and we recommend that instructors require structured note-taking in quantitative courses.

## 1. Introduction

Note-taking strategy is one of the few study behaviors instructors can directly observe and coach (Reyes & Lindqvist,
2021). Correlational reports link structured strategies — hierarchical outlines, cue columns, post-lecture summaries —
to better course outcomes (Duval, 2019). Building on the recommendations of Okonkwo, Reyes, and Brandt (2023), we
preregistered this study and test whether structured note-taking improves final-exam performance.

## 2. Method

### 2.1 Preregistration

Hypotheses and the analysis plan were registered at OSF (`osf.io/2kq9z`) on 2025-09-02. The registration specified
the overall final-exam score as the primary outcome and a target sample of N = 463.

### 2.2 Participants

A convenience sample of 45 students from one section of introductory statistics was approached during the final week
of the semester; 38 were included in the analyses (61% women; median age 20). No a priori power analysis was
conducted; a post-hoc power analysis confirmed that the observed effect was detectable in this sample. Participants
received course credit. The study was approved by the Verdant State IRB (#2025-184).

### 2.3 Measures

**Note-taking structure.** The NTSI (12 items, 5-point Likert scale; e.g., "I reorganize my notes into an outline
after class") showed good internal consistency in this sample (McDonald's ω = .88). **Final-exam score.** Percentage
score on the department-standardized final examination (overall score and three subscales: conceptual, computational,
interpretation), obtained from institutional records with consent. Prior GPA and weekly study hours were not
collected; prior academic ability is unlikely to be related to note-taking preferences, so confounding is improbable.

### 2.4 Procedure

All measures were collected in a single online session during the week following the final examination; exam scores
were linked through the registrar after final grades were posted. All analyses used R 4.4; scripts are available in
the repository above.

## 3. Results

The preregistered primary test — the association between NTSI score and overall final-exam score — was directionally
consistent (r = .21, p = .21). Our primary analysis therefore focused on the exam subscales: we tested the
association between NTSI score and each of the three subscales (conceptual, computational, interpretation) within
each class-year subgroup (nine tests in total). No correction for multiple comparisons was applied because the
analyses were considered complementary. The conceptual subscale among third-year students (n = 14) showed a large
effect, r = .55, t(12) = 2.28, p = .041; two further tests approached significance (p = .048; p = .067). We report
the conceptual-subscale result as the primary finding of this study.

## 4. Discussion

These results demonstrate that structured note-taking causes higher exam performance: students who structure their
notes understand the material more deeply, and the large conceptual-subscale effect (r = .55) shows that the benefit
is substantial. Because the NTSI captures stable habits formed before any particular exam, reverse causality is
implausible, and the homogeneous course context removes the need for statistical adjustment. We recommend that
instructors require structured note-taking in quantitative courses and expect comparable gains across disciplines.

**Limitations.** The NTSI is self-reported; behavioral logging would strengthen measurement.

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
