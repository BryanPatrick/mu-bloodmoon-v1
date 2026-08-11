# Chronicles components

Public editorial components used by `/gazeta`.

- `ChronicleMasthead`: edition identity and category filter.
- `ChronicleLeadStory`: lead article presentation.
- `ChronicleStoryCard`: reusable compact article summary.
- `ChroniclePeriodSummary`: non-telemetric daily, weekly, and monthly preview.
- `ChronicleFutureFeature`: disabled previews for audio and cinematic features.

Components receive normalized `ChronicleStory` data and do not fetch API data directly.
