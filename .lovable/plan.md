## Goal
Stop existing users who already have a training center from being redirected back to the setup screen after login.

## Findings
- The backend shows the affected users already have `profiles.center_id`, a training center, and a `center_admin` role.
- The setup form fails because the backend correctly says: “User already belongs to a training center”.
- The likely bug is frontend state timing: `ProtectedRoute` checks `profile.center_id` before the profile context has fully refreshed, so it redirects to `/onboarding` even though the account is already set up.

## Plan
1. Update `AuthProvider` so loading stays true while the user profile, center, and roles are being fetched after login/auth changes.
2. Prevent stale profile state from causing redirects by clearing/loading context deliberately before each profile fetch.
3. Update `/onboarding` so if the logged-in user already has `profile.center_id`, it automatically sends them to `/app` instead of showing the setup form.
4. Keep the existing backend `create_training_center` protection unchanged because it is correctly preventing duplicate centers.
5. Verify login/onboarding behavior by checking the app route no longer loops for already-onboarded users.