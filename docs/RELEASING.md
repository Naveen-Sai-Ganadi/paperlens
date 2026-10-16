# Releasing the desktop app

This is for maintainers (and forks that publish their own builds). Public installers are built, signed and uploaded by GitHub Actions (`.github/workflows/release.yml`) for macOS (Apple Silicon and Intel), Windows and Linux. The workflow refuses to build Mac or Windows installers without signing credentials.

1. Add these repository secrets (GitHub → Settings → Secrets and variables → Actions):

   | Secret | What it is |
   | --- | --- |
   | `MAC_CSC_LINK` | Your **Developer ID Application** certificate exported as `.p12`, base64-encoded (`base64 -i cert.p12 \| pbcopy`) |
   | `MAC_CSC_KEY_PASSWORD` | The password you set when exporting the `.p12` |
   | `APPLE_ID` | Your Apple Developer account email |
   | `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password from account.apple.com, used for notarization |
   | `APPLE_TEAM_ID` | Your 10-character team ID (developer.apple.com → Membership) |
   | `WIN_CSC_LINK` | Windows code-signing certificate (`.pfx`), base64-encoded |
   | `WIN_CSC_KEY_PASSWORD` | Its password |

2. Bump `version` in `package.json`, then tag and push:

   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```

3. When the workflow finishes, open the draft release on GitHub, check it, and click **Publish**. The website's download page (`/download`) links to `releases/latest`, so it picks up the new version automatically.
