# Apyclipy Release Checklist

Use this checklist before releasing new versions of Apyclipy.

## Pre-Release Verification

1. **Frontend Verification**:
   - [ ] Run `npx tsc --noEmit` in `frontend/` (ensure 0 errors).
   - [ ] Run `npm run build` in `frontend/` (verify clean production bundle).
   - [ ] Check UI in browser across both light and dark themes.
   - [ ] Verify zero untranslated Chinese text in the UI.

2. **Backend & Pipeline Verification**:
   - [ ] Verify API endpoints are responding on `http://localhost:8000/docs`.
   - [ ] Test video import with URL and local file.
   - [ ] Verify selective crop interval (`start_time` and `end_time`).
   - [ ] Verify target clip counts and quality options.
   - [ ] Confirm output video has no watermark or outro appended.

3. **Packaging & Deployment**:
   - [ ] Ensure `.env.example` is up to date.
   - [ ] Verify `docker compose build` builds without errors.
