# Flutter referral autofill — wire-up

Packages already in `pubspec.yaml`: `play_install_referrer`, `app_links`, `flutter_inappwebview`, `shared_preferences`.

## Files placed

| File | Purpose |
|------|---------|
| `android/app/src/main/AndroidManifest.xml` | Fixed App Links (`dromoney.com/join/...`) |
| `lib/services/referral_install_bridge.dart` | Play Install Referrer → WebView |
| `frontend/public/.well-known/assetlinks.json` | Website verification (deploy frontend) |

## In your WebView screen

```dart
import 'package:webview_master_app/services/referral_install_bridge.dart';

// main() or first screen:
await ReferralInstallBridge.instance.init();

// InAppWebView:
onWebViewCreated: (controller) {
  ReferralInstallBridge.instance.registerWebViewHandlers(controller);
},
onLoadStop: (controller, url) async {
  await ReferralInstallBridge.instance.injectIntoWebView(controller);
},
```

## After deploy

1. Frontend Vercel deploy → `https://dromoney.com/.well-known/assetlinks.json` must show JSON
2. New Play Store build with this Manifest + bridge
3. Test: uninstall app → open invite Play Store link → install → open Sign Up → invite code autofills

**Note:** Install Referrer only works on a **fresh install from Play Store**, not if the app was already installed.
