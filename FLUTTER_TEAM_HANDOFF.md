# Flutter team handoff — Invite code autofill after Play Store install

Website already expects this. Flutter must read Play Install Referrer and push it into the WebView.

---

## 1) `pubspec.yaml` — add dependencies

```yaml
dependencies:
  flutter_inappwebview: ^6.1.5   # already if you use InAppWebView
  play_install_referrer: ^0.5.0
  app_links: ^7.2.1
  shared_preferences: ^2.3.2
```

Then run: `flutter pub get`

---

## 2) `android/app/src/main/AndroidManifest.xml`

Inside `<activity android:name=".MainActivity" ...>` add (keep existing MAIN/LAUNCHER filter):

```xml
<meta-data
    android:name="flutter_deeplinking_enabled"
    android:value="true" />

<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="dromoney.com" android:pathPrefix="/join" />
    <data android:scheme="https" android:host="www.dromoney.com" android:pathPrefix="/join" />
    <data android:scheme="https" android:host="dromoney.com" android:pathPrefix="/user/auth/register" />
    <data android:scheme="https" android:host="www.dromoney.com" android:pathPrefix="/user/auth/register" />
</intent-filter>
```

Package name must be `com.dromoney.user` (matches website assetlinks).

---

## 3) New file: `lib/services/referral_install_bridge.dart`

Copy the full file from this repo:  
`lib/services/referral_install_bridge.dart`

---

## 4) Wire into WebView (only change needed in your screen)

### `main.dart` (before `runApp`)

```dart
import 'services/referral_install_bridge.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ReferralInstallBridge.instance.init(); // IMPORTANT: before WebView
  runApp(const MyApp());
}
```

### Your `InAppWebView` widget

```dart
InAppWebView(
  // ... your existing options / initialUrl ...
  onWebViewCreated: (controller) {
    ReferralInstallBridge.instance.registerWebViewHandlers(controller);
    // keep any other handlers you already have
  },
  onLoadStop: (controller, url) async {
    await ReferralInstallBridge.instance.injectIntoWebView(controller);
    // keep any other onLoadStop logic
  },
)
```

That is enough. Website Sign Up will autofill invite code.

---

## 5) What website already listens for

Flutter → Web:

- `window.savePendingReferral(rawReferrerString)`
- handlers: `getInstallReferrer`, `getPlayInstallReferrer`, `getReferrer`, `getReferralCode`

Example Play referrer string:

```text
utm_source=invite&utm_medium=share&utm_content=9GNMQN&ref=9GNMQN
```

---

## 6) Test checklist

1. Uninstall app completely  
2. Open invite Play Store link (with `referrer=` / `ref=CODE`)  
3. Install → open app → Sign Up  
4. Invite code field should autofill  

**Note:** Already-installed app pe Install Referrer nahi aata. Fresh Play install required.

---

## 7) Website side (other team / DevOps)

Deploy frontend so this returns JSON (not HTML):

`https://dromoney.com/.well-known/assetlinks.json`

File lives at: `frontend/public/.well-known/assetlinks.json`
