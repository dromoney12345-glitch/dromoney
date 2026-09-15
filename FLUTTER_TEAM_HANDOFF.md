# Flutter team — referral link update (BlueRide-style)

## New share format (website already sends this)

```
Join me on Dromoney! Using my invite code 9GNMQN to start earning 🚀

App: https://dromoney.com/referral?code=9GNMQN
```

## Flutter requirements

### 1) App Links in `AndroidManifest.xml`

Add `/referral` (keep `/join` too):

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="dromoney.com" android:pathPrefix="/referral" />
    <data android:scheme="https" android:host="www.dromoney.com" android:pathPrefix="/referral" />
    <data android:scheme="https" android:host="dromoney.com" android:pathPrefix="/join" />
    <data android:scheme="https" android:host="www.dromoney.com" android:pathPrefix="/join" />
    <data android:scheme="https" android:host="dromoney.com" android:pathPrefix="/user/auth/register" />
    <data android:scheme="https" android:host="www.dromoney.com" android:pathPrefix="/user/auth/register" />
</intent-filter>
```

Updated file also in this repo: `android/app/src/main/AndroidManifest.xml`

### 2) Deep link → WebView

When app opens from `https://dromoney.com/referral?code=XXXX`:

1. Parse `code` query param  
2. Load WebView to:  
   `https://dromoney.com/user/auth/register?invite=XXXX`  
   **or** inject: `window.savePendingReferral('XXXX')`

### 3) Play Install Referrer (unchanged — still required)

After Play Store install from that flow, still call:

- `ReferralInstallBridge.instance.init()`
- `registerWebViewHandlers(controller)`
- `injectIntoWebView(controller)` on load

File: `lib/services/referral_install_bridge.dart`

### 4) Packages

```yaml
play_install_referrer: ^0.5.0
app_links: ^7.2.1
shared_preferences: ^2.3.2
flutter_inappwebview: ^6.x
```

## Flow

1. User shares WhatsApp message with `/referral?code=`  
2. Friend opens link → site saves code → Android browser goes to Play Store with referrer  
3. Fresh install → Flutter reads Install Referrer → Sign Up autofill → register → ₹200 to referrer  

## Test

1. Share invite from Affiliate Center  
2. Confirm message looks like BlueRide (code + `App: https://dromoney.com/referral?code=...`)  
3. Uninstall app → open link → install → Sign Up shows code  
