---
marp: true
theme: poster
size: a0
paginate: false
style: |
  section { --accent: #0969da; }
---

<header class="poster-header">

<div class="poster-logo">

![logo](shared/logos/marp-logo.svg)

</div>

<div class="poster-title">

# Wearable Skin-Stretch Feedback for Spatial Guidance in VR

<p class="poster-authors">Takumi Nishimura, Co-Author Two, Co-Author Three</p>
<p class="poster-affil">Haptics Lab, Department of Information Science, Example University</p>

</div>

<div class="poster-logo">

![logo](shared/logos/marp-logo.svg)

</div>

</header>

<div class="poster-columns">
<div class="poster-col">

<section class="poster-section">

## Background

- Visual-only guidance in VR increases cognitive load during navigation
- Auditory cues compete with environmental sound and speech
- **Skin-stretch** cues deliver direction without occluding the scene or ears
- Prior wrist haptics relied on vibration, which fatigues quickly
- Open question: can a wrist-worn device match audio guidance accuracy?

</section>

<section class="poster-section">

## Research Question

<div class="important">

Can lightweight skin-stretch feedback guide users along a target path **as accurately as** spatial audio, with **lower** subjective workload?

</div>

</section>

<section class="poster-section">

## Apparatus

![w:100%](shared/img/fig.png)

- Two tangential actuators per wrist band
- 2 mm stretch amplitude, 0.5–4 Hz update
- Untethered, 38 g total mass

</section>

</div>
<div class="poster-col">

<section class="poster-section">

## Method

- Within-subjects study, **N = 24** participants
- Three conditions: skin-stretch, spatial audio, visual arrow
- Task: follow a curved path through a virtual corridor
- Counterbalanced order, 12 trials per condition
- Metrics: path error, completion time, NASA-TLX

<div class="note">

Each session lasted ~45 min including a 5-min familiarization block.

</div>

</section>

<section class="poster-section highlight">

## Key Result

<div class="poster-stat">

Skin-stretch matched audio on **path error**
(2.1 cm vs 2.0 cm, *n.s.*) while cutting
perceived workload by **31%**.

</div>

</section>

<section class="poster-section">

## Results

| Condition | Path error | TLX |
| :-------- | :--------: | :-: |
| Visual | 3.4 cm | 58 |
| Audio | 2.0 cm | 49 |
| Skin-stretch | 2.1 cm | 34 |

Lower workload without loss of accuracy.

</section>

</div>
<div class="poster-col">

<section class="poster-section">

## Discussion

- Skin-stretch frees the visual and auditory channels
- Benefit is largest in **noisy** environments
- Accuracy held across age groups (18–54)
- Trade-off: lower spatial bandwidth than audio
- Some users wanted a stronger cue at sharp turns

</section>

<section class="poster-section">

## Conclusion

- Wrist skin-stretch is a viable guidance modality for VR
- Comparable accuracy to audio at **31% lower** workload
- Untethered form factor suits room-scale and mobile VR
- Next: outdoor pedestrian navigation field trial

</section>

<section class="poster-section">

## Future Work

1. Multi-actuator full-arm cues for richer directionality
2. Adaptive amplitude by walking speed
3. Long-term adaptation and learning study

</section>

</div>
</div>

<footer class="poster-footer">

<div class="poster-refs">

**References** [1] Author et al., *Skin-stretch for navigation*, CHI 2024. [2] Author et al., *Haptic guidance survey*, ToH 2023. [3] Author et al., *Spatial audio in VR*, UIST 2022.

</div>

<div class="poster-contact">

📧 24takumin@gmail.com
🔗 haptics-lab.example.edu

</div>

</footer>
