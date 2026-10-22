# Releasing the desktop app

This is for maintainers (and forks that publish their own builds). GitHub Actions (`.github/workflows/release.yml`) builds the installers for macOS (Apple Silicon and Intel), Windows and Linux and uploads them to a draft GitHub release.

1. Bump `version` in `package.json` and commit it.
2. Tag that commit with the same version and push the tag:

   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```

3. When the workflow finishes, open the draft release on GitHub, check it, and click **Publish**. The website's download page (`/download`) links to `releases/latest`, so it picks up the new version automatically.

## Signing

Without signing secrets the installers are unsigned. macOS users approve the app once under System Settings → Privacy & Security → **Open Anyway**, and Windows users click **More info → Run anyway**. The download page explains both.

To ship signed installers without those prompts, add these repository secrets (GitHub → Settings → Secrets and variables → Actions). The workflow uses them automatically when present.

| Secret | What it is |
| --- | --- |
| `MAC_CSC_LINK` | Your **Developer ID Application** certificate exported as `.p12`, base64-encoded (`base64 -i cert.p12 \| pbcopy`). Needs an Apple Developer account ($99/year). |
| `MAC_CSC_KEY_PASSWORD` | The password you set when exporting the `.p12` |
| `APPLE_ID` | Your Apple Developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password from account.apple.com, used for notarization |
| `APPLE_TEAM_ID` | Your 10-character team ID (developer.apple.com → Membership) |
| `WIN_CSC_LINK` | Windows code-signing certificate (`.pfx`), base64-encoded |
| `WIN_CSC_KEY_PASSWORD` | Its password |

Once signing is set up, remove the security-prompt steps from `src/components/DownloadPage.tsx`.
