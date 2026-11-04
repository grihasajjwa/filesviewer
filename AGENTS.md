# Upload architecture
- Personal and admin-folder uploads use the shared AdminPanel with visible native file inputs and unique IDs, so mobile selection does not depend on hidden-input activation.
- Prepare uploaded photos through prepareUpload before storage and metadata writes; HEIC decoding runs in a worker where supported, with a browser fallback, to keep phones responsive and store previewable JPEGs.

# Data lifecycle
- File deletion is a soft delete: every admin/user delete writes `files.deleted_at` instead of removing the row; `files` queries outside the admin Trash tab must filter `.is('deleted_at', null)`. Permanent removal only happens from the admin Trash view.