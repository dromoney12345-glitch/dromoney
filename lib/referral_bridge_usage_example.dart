/// EXAMPLE — copy these calls into your real WebView screen / main.dart
/// (This file is a reference only; adjust imports to your project structure.)
///
/// 1) main.dart — before runApp:
///    await ReferralInstallBridge.instance.init();
///
/// 2) InAppWebView callbacks:
///    onWebViewCreated: (c) => ReferralInstallBridge.instance.registerWebViewHandlers(c);
///    onLoadStop: (c, url) => ReferralInstallBridge.instance.injectIntoWebView(c);

library;
